#!/usr/bin/env tsx
/**
 * Upload tier preview images to IPFS via Pinata
 * Run this once to get IPFS CIDs for all tier images
 */

import { uploadFile } from 'pinata';
import fs from 'fs';
import path from 'path';

const TIER_NAMES = [
  'silver',
  'graphite',
  'bronze',
  'copper',
  'emerald',
  'sapphire',
  'green',
  'ruby',
  'gold',
  'magenta',
  'obelisk',
  'obelisk-ultra'
];

async function uploadTierImages() {
  const PINATA_JWT = process.env.PINATA_JWT;
  const PINATA_GROUP_ID = process.env.PINATA_GROUP_ID;

  if (!PINATA_JWT) {
    console.error('❌ PINATA_JWT not set in environment variables');
    process.exit(1);
  }

  console.log('📤 Uploading tier images to IPFS...\n');

  const pinataConfig = { pinataJwt: PINATA_JWT };
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const groupId = PINATA_GROUP_ID && uuidRegex.test(PINATA_GROUP_ID) ? PINATA_GROUP_ID : undefined;

  const imagesDir = path.join(process.cwd(), 'public', 'tier-images');
  const results: Record<string, string> = {};

  for (const tierName of TIER_NAMES) {
    const filename = `${tierName}.png`;
    const filepath = path.join(imagesDir, filename);

    if (!fs.existsSync(filepath)) {
      console.log(`⚠️  Warning: ${filename} not found, skipping...`);
      continue;
    }

    try {
      console.log(`Uploading ${filename}...`);

      const file = new File([fs.readFileSync(filepath)], filename, {
        type: 'image/png',
      });

      const upload = await uploadFile(
        pinataConfig,
        file,
        'public',
        {
          metadata: {
            name: `Parity 10 Years - ${tierName} tier preview`,
          },
          ...(groupId && { groupId }),
        }
      );

      const ipfsUrl = `ipfs://${upload.cid}`;
      results[tierName] = ipfsUrl;

      console.log(`  ✅ ${tierName}: ${ipfsUrl}`);
    } catch (error) {
      console.error(`  ❌ Failed to upload ${filename}:`, error);
    }
  }

  console.log('\n==========================================');
  console.log('Upload Complete');
  console.log('==========================================\n');

  console.log('Add this to your code:\n');
  console.log('const TIER_IMAGE_IPFS: Record<string, string> = {');
  for (const [tierName, ipfsUrl] of Object.entries(results)) {
    console.log(`  '${tierName}': '${ipfsUrl}',`);
  }
  console.log('};\n');

  console.log('Or as environment variables:\n');
  for (const [tierName, ipfsUrl] of Object.entries(results)) {
    const envKey = `TIER_IMAGE_${tierName.toUpperCase().replace(/-/g, '_')}`;
    console.log(`${envKey}="${ipfsUrl}"`);
  }
}

uploadTierImages().catch(console.error);
