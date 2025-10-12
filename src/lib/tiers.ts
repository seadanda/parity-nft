// Tier definitions matching the backend
export interface Tier {
  name: string;
  weight: number;
  rarity: string;
  glassColor: string;
  glowColor: string;
}

export const TIERS: Tier[] = [
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

export function getTierByName(name: string): Tier | undefined {
  return TIERS.find(t => t.name === name);
}
