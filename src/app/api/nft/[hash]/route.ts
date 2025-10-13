import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MintedNFT {
  timestamp: string;
  collection: number;
  nftId: number;
  owner: string;
  hash: string;
  metadataIpfs?: string;
  metadataJson?: {
    name: string;
    description: string;
    image: string;
    animation_url: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  local?: boolean;
  transactionHash?: string;
}

interface NFTMetadataResponse {
  success: boolean;
  nftId: string;
  collectionId: number;
  hash: string;
  tier: string;
  rarity: string;
  glassColor: string;
  glowColor: string;
  ipfsImageUrl: string;
  ipfsMetadataUrl: string;
  animationUrl?: string;
  owner: string;
  transactionHash?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  error?: string;
}

// Tier definitions matching the minting script
const TIERS = [
  { name: 'Graphite', weight: 20, rarity: 'Common', glassColor: '#1a1a1a', glowColor: '#ffffff' },
  { name: 'Bronze', weight: 12, rarity: 'Common', glassColor: '#cd7f32', glowColor: '#ff9944' },
  { name: 'Silver', weight: 8, rarity: 'Uncommon', glassColor: '#c0c0c0', glowColor: '#ffffff' },
  { name: 'Copper', weight: 8, rarity: 'Uncommon', glassColor: '#b87333', glowColor: '#ff6633' },
  { name: 'Emerald', weight: 5, rarity: 'Rare', glassColor: '#50c878', glowColor: '#00ff00' },
  { name: 'Sapphire', weight: 3, rarity: 'Very Rare', glassColor: '#0f52ba', glowColor: '#0080ff' },
  { name: 'Green', weight: 3, rarity: 'Very Rare', glassColor: '#00ff00', glowColor: '#00ff00' },
  { name: 'Ruby', weight: 2, rarity: 'Ultra Rare', glassColor: '#e0115f', glowColor: '#ff0040' },
  { name: 'Gold', weight: 1.5, rarity: 'Ultra Rare', glassColor: '#ffd700', glowColor: '#ffff00' },
  { name: 'Magenta', weight: 0.5, rarity: 'Legendary', glassColor: '#ff00ff', glowColor: '#ff00a8' },
  { name: 'Obelisk', weight: 0.5, rarity: 'Legendary', glassColor: '#4b0082', glowColor: '#9400d3' },
  { name: 'Obelisk Ultra', weight: 0.5, rarity: 'Legendary', glassColor: '#ff1493', glowColor: '#ff69b4' }
];

/**
 * Simple seeded random number generator (Mulberry32)
 * Matches the viewer and minting script implementation
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Convert Koda hash to seed (matching viewer's algorithm)
 * NOTE: Uses the original hash string INCLUDING "0x" prefix
 */
function hashToSeed(hash: string): number {
  // KodaDot's standard algorithm: sum 5 chunks of 12 chars each
  let seed = 0;
  for (let hl = 0; hl < 60; hl = hl + 12) {
    seed += parseInt(hash.substring(hl, hl + 12), 16);
  }

  return seed;
}

/**
 * Calculate tier from hash (matching viewer's logic)
 */
function calculateTierFromHash(hash: string): typeof TIERS[0] {
  const seed = hashToSeed(hash);
  const rng = new SeededRandom(seed);

  // Calculate total weight
  const totalWeight = TIERS.reduce((sum, tier) => sum + tier.weight, 0);

  // Pick weighted tier
  const roll = rng.next() * totalWeight;
  let accumulator = 0;

  for (const tier of TIERS) {
    accumulator += tier.weight;
    if (roll <= accumulator) {
      return tier;
    }
  }

  // Fallback (should never happen)
  return TIERS[0];
}

/**
 * GET /api/nft/[hash]
 * Fetches NFT metadata by hash from the minted_nfts.json file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
): Promise<NextResponse<NFTMetadataResponse>> {
  const resolvedParams = await params;
  try {
    const { hash } = resolvedParams;

    // Validate hash format (must be 66 characters: 0x + 64 hex)
    if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      return NextResponse.json(
        {
          success: false,
          nftId: '',
          hash: hash || '',
          tier: '',
          rarity: '',
          glassColor: '',
          glowColor: '',
          ipfsImageUrl: '',
          ipfsMetadataUrl: '',
          owner: '',
          error: 'Invalid hash format. Expected 66-character Koda hash (0x + 64 hex characters)'
        },
        { status: 400 }
      );
    }

    // Path to minted_nfts.json in the project root
    const mintedNftsPath = path.join(process.cwd(), '..', 'minted_nfts.json');

    // Check if file exists
    if (!fs.existsSync(mintedNftsPath)) {
      return NextResponse.json(
        {
          success: false,
          nftId: '',
          hash,
          tier: '',
          rarity: '',
          glassColor: '',
          glowColor: '',
          ipfsImageUrl: '',
          ipfsMetadataUrl: '',
          owner: '',
          error: 'NFT database not found'
        },
        { status: 404 }
      );
    }

    // Read and parse the minted NFTs file (newline-delimited JSON)
    const fileContent = fs.readFileSync(mintedNftsPath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());

    // Find the NFT with matching hash
    let nftData: MintedNFT | null = null;
    for (const line of lines) {
      try {
        const nft = JSON.parse(line) as MintedNFT;
        if (nft.hash.toLowerCase() === hash.toLowerCase()) {
          nftData = nft;
          break;
        }
      } catch (parseError) {
        // Skip invalid JSON lines
        console.error('Failed to parse line:', parseError);
      }
    }

    if (!nftData) {
      return NextResponse.json(
        {
          success: false,
          nftId: '',
          hash,
          tier: '',
          rarity: '',
          glassColor: '',
          glowColor: '',
          ipfsImageUrl: '',
          ipfsMetadataUrl: '',
          owner: '',
          error: 'NFT not found'
        },
        { status: 404 }
      );
    }

    // Extract tier information from metadata or calculate from hash
    let tierInfo;
    if (nftData.metadataJson?.attributes) {
      const tierAttr = nftData.metadataJson.attributes.find(
        attr => attr.trait_type === 'Tier'
      );
      const rarityAttr = nftData.metadataJson.attributes.find(
        attr => attr.trait_type === 'Rarity'
      );

      if (tierAttr && rarityAttr) {
        tierInfo = TIERS.find(t => t.name === tierAttr.value);
      }
    }

    // If tier info not found in metadata, calculate from hash
    if (!tierInfo) {
      tierInfo = calculateTierFromHash(hash);
    }

    // Build response
    const response: NFTMetadataResponse = {
      success: true,
      nftId: nftData.nftId.toString(),
      collectionId: nftData.collection,
      hash: nftData.hash,
      tier: tierInfo.name,
      rarity: tierInfo.rarity,
      glassColor: tierInfo.glassColor,
      glowColor: tierInfo.glowColor,
      ipfsImageUrl: nftData.metadataJson?.image || '',
      ipfsMetadataUrl: nftData.metadataIpfs || '',
      animationUrl: nftData.metadataJson?.animation_url || '',
      owner: nftData.owner,
      transactionHash: nftData.transactionHash,
      attributes: nftData.metadataJson?.attributes || []
    };

    // Add CORS headers for local development
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('Error fetching NFT metadata:', error);

    return NextResponse.json(
      {
        success: false,
        nftId: '',
        hash: resolvedParams.hash || '',
        tier: '',
        rarity: '',
        glassColor: '',
        glowColor: '',
        ipfsImageUrl: '',
        ipfsMetadataUrl: '',
        owner: '',
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/nft/[hash]
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return new NextResponse(null, { status: 204, headers });
}
