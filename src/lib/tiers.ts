// Tier definitions matching the backend
export interface Tier {
  name: string;
  weight: number;
  rarity: string;
  glassColor: string;
  glowColor: string;
}

export const TIERS: Tier[] = [
  { name: 'Graphite', weight: 20, rarity: 'Common', glassColor: '#1a1a1a', glowColor: '#ffffff' },
  { name: 'Bronze', weight: 12, rarity: 'Common', glassColor: '#cd7f32', glowColor: '#ff9944' },
  { name: 'Silver', weight: 8, rarity: 'Uncommon', glassColor: '#c0c0c0', glowColor: '#ffffff' },
  { name: 'Copper', weight: 8, rarity: 'Uncommon', glassColor: '#b87333', glowColor: '#ff6600' },
  { name: 'Emerald', weight: 5, rarity: 'Rare', glassColor: '#50C878', glowColor: '#00ff00' },
  { name: 'Sapphire', weight: 3, rarity: 'Very Rare', glassColor: '#0f52ba', glowColor: '#0099ff' },
  { name: 'Green', weight: 3, rarity: 'Very Rare', glassColor: '#00ff00', glowColor: '#00ff00' },
  { name: 'Ruby', weight: 2, rarity: 'Ultra Rare', glassColor: '#e0115f', glowColor: '#ff0040' },
  { name: 'Gold', weight: 1.5, rarity: 'Ultra Rare', glassColor: '#ffd700', glowColor: '#ffaa00' },
  { name: 'Magenta', weight: 0.5, rarity: 'Legendary', glassColor: '#ff00a8', glowColor: '#ff00a8' },
  { name: 'Obelisk', weight: 0.5, rarity: 'Legendary', glassColor: '#e100ff', glowColor: '#e100ff' },
  { name: 'Obelisk Ultra', weight: 0.5, rarity: 'Legendary', glassColor: '#ff00ff', glowColor: '#ff00ff' }
];

export function getTierByName(name: string): Tier | undefined {
  return TIERS.find(t => t.name === name);
}
