// Tier definitions - MUST match sketch-nobase64.js exactly for deterministic generation
export const TIERS = [
  { name: 'Silver', weight: 8, rarity: 'Uncommon', glassColor: '#ffffff', glowColor: '#ffffff' },
  { name: 'Graphite', weight: 20, rarity: 'Common', glassColor: '#2b2f36', glowColor: '#7a8899' },
  { name: 'Bronze', weight: 12, rarity: 'Common', glassColor: '#cd7f32', glowColor: '#755b5b' },
  { name: 'Copper', weight: 8, rarity: 'Uncommon', glassColor: '#e81308', glowColor: '#be8a46' },
  { name: 'Emerald', weight: 5, rarity: 'Rare', glassColor: '#17a589', glowColor: '#66ffc8' },
  { name: 'Sapphire', weight: 3, rarity: 'Very Rare', glassColor: '#1f5fff', glowColor: '#66a3ff' },
  { name: 'Green', weight: 3, rarity: 'Very Rare', glassColor: '#005908', glowColor: '#ddffdd' },
  { name: 'Ruby', weight: 2, rarity: 'Ultra Rare', glassColor: '#dc5e85', glowColor: '#ff6f91' },
  { name: 'Gold', weight: 1.5, rarity: 'Ultra Rare', glassColor: '#ffd700', glowColor: '#ffe680' },
  { name: 'Magenta', weight: 0.5, rarity: 'Legendary', glassColor: '#ff00a8', glowColor: '#ff66cc' },
  { name: 'Obelisk', weight: 0.5, rarity: 'Legendary', glassColor: '#000000', glowColor: '#ffffff' },
  { name: 'Obelisk Ultra', weight: 0.5, rarity: 'Legendary', glassColor: '#000000', glowColor: '#ed1d64' }
];

// Seeded random number generator (Mulberry32)
class SeededRandom {
  seed: number;

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

// Convert Koda hash to seed - MUST match staging/sketch.js EXACTLY
function hashToSeed(hash: string): number {
  // KodaDot's standard algorithm: sum 5 chunks of 12 chars each
  // NOTE: Uses the original hash string INCLUDING "0x" prefix
  let seed = 0;
  for (let hl = 0; hl < 60; hl = hl + 12) {
    seed += parseInt(hash.substring(hl, hl + 12), 16);
  }
  return seed;
}

// Calculate tier from hash
export function calculateTierFromHash(hash: string) {
  const seed = hashToSeed(hash);
  const rng = new SeededRandom(seed);
  const totalWeight = TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  const roll = rng.next() * totalWeight;
  let accumulator = 0;

  for (const tier of TIERS) {
    accumulator += tier.weight;
    if (roll <= accumulator) {
      return tier;
    }
  }

  return TIERS[0];
}
