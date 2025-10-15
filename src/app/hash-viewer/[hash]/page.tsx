'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import NFTCanvas from '@/components/NFTCanvas';
import { TIERS } from '@/lib/tiers';

/**
 * Simple seeded random number generator (Mulberry32)
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
 * Calculate tier from hash using weighted randomness
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
 * Simple hash viewer for image generation
 * Displays the 3D NFT based on hash without requiring database lookup
 */
export default function HashViewerPage() {
  const params = useParams();
  const hash = params.hash as string;

  // Calculate tier from hash
  const tier = useMemo(() => {
    if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      return TIERS[0]; // Default tier
    }
    return calculateTierFromHash(hash);
  }, [hash]);

  return (
    <div className="w-screen h-screen bg-[#0a0a0f]">
      <NFTCanvas
        glassColor={tier.glassColor}
        glowColor={tier.glowColor}
        autoRotate={false}
        loadHDR={true}
      />
    </div>
  );
}
