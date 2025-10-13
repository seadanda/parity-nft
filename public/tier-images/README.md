# Tier Preview Images

This directory contains static preview images for each NFT tier.

## Required Files

Generate 12 preview images (2048x2048 PNG recommended):

- `silver.png` - Silver tier (white glass)
- `graphite.png` - Graphite tier (dark grey glass)
- `bronze.png` - Bronze tier
- `copper.png` - Copper tier (red/orange glass)
- `emerald.png` - Emerald tier (green glass)
- `sapphire.png` - Sapphire tier (blue glass)
- `green.png` - Green tier
- `ruby.png` - Ruby tier (pink glass)
- `gold.png` - Gold tier
- `magenta.png` - Magenta tier
- `obelisk.png` - Obelisk tier (black glass, white glow)
- `obelisk-ultra.png` - Obelisk Ultra tier (black glass, pink glow)

## How to Generate

1. Start the local 3D viewer:
   ```bash
   cd /Users/donal/dev/parity-nft
   python3 -m http.server 8000
   ```

2. Open each tier in browser:
   - http://localhost:8000?tier=Silver
   - http://localhost:8000?tier=Graphite
   - http://localhost:8000?tier=Bronze
   - ... etc

3. Take screenshots (use browser DevTools device mode for consistent 2048x2048 size)

4. Save as PNG files in this directory with lowercase names

## Usage

These images are used in:
- NFT metadata as preview images
- Email notifications
- Social media sharing

The `mintNFT()` function automatically selects the correct image based on the tier:
```typescript
const imageUrl = `/tier-images/${tierInfo.name.toLowerCase().replace(/ /g, '-')}.png`;
```
