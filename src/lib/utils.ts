import { type ClassValue, clsx } from 'clsx';

// Utility for merging class names (useful with Tailwind)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Truncate address for display
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// Format hash for display
export function formatHash(hash: string): string {
  if (!hash.startsWith('0x')) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

// Copy to clipboard helper
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
