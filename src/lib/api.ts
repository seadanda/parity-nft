import { MintFormData } from './validation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface MintResponse {
  success: boolean;
  hash?: string;
  nftId?: number;
  tier?: string;
  rarity?: string;
  glassColor?: string;
  glowColor?: string;
  imageUrl?: string;
  metadataUrl?: string;
  transactionHash?: string;
  error?: string;
}

export interface NFTMetadata {
  hash: string;
  nftId: number;
  tier: string;
  rarity: string;
  glassColor: string;
  glowColor: string;
  owner: string;
  mintedAt: string;
  imageUrl: string;
  metadataUrl: string;
}

export async function mintNFT(data: MintFormData): Promise<MintResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Failed to mint NFT');
  }

  return response.json();
}

export async function getNFTMetadata(hash: string): Promise<NFTMetadata> {
  const response = await fetch(`${API_BASE_URL}/api/nft/${hash}`);

  if (!response.ok) {
    throw new Error('NFT not found');
  }

  return response.json();
}
