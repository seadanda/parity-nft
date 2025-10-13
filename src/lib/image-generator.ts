/**
 * NFT Preview Image Generator
 * Uses Puppeteer to screenshot the 3D viewer and upload to Pinata
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import { uploadFile } from 'pinata';

export async function generateAndUploadImage(hash: string, nftId: number): Promise<string> {
  console.log(`🎨 Generating preview image for NFT #${nftId}`);

  const browser = await puppeteer.launch({
    headless: 'new' as unknown as boolean,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--enable-webgl',
      '--enable-accelerated-2d-canvas',
      '--force-color-profile=srgb',
      '--force-device-scale-factor=2'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set viewport to square aspect ratio with high quality
    const imageSize = 2048;
    await page.setViewport({
      width: imageSize,
      height: imageSize,
      deviceScaleFactor: 2
    });

    // Load the image generator page via HTTP (served from /public)
    const viewerUrl = `http://localhost:3000/image-gen.html?hash=${hash}`;
    console.log(`   Loading viewer: ${viewerUrl}`);

    await page.goto(viewerUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for Three.js canvas to be rendered
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Additional wait for scene setup, model loading, and bloom stabilization
    // This gives enough time for: HDR load, GLB load, materials compile, bloom passes
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take full page screenshot
    const imagePath = `/tmp/nft-preview-${nftId}.png`;
    await page.screenshot({
      path: imagePath,
      type: 'png',
      fullPage: false
    });

    console.log(`   ✅ Screenshot saved: ${imagePath}`);

    // Upload to Pinata
    const ipfsUrl = await uploadImageToIPFS(imagePath, nftId);

    // Clean up temp file
    fs.unlinkSync(imagePath);

    return ipfsUrl;

  } catch (error) {
    console.error('❌ Failed to generate image:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function uploadImageToIPFS(imagePath: string, nftId: number): Promise<string> {
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured');
  }

  const PINATA_GROUP_ID = process.env.PINATA_GROUP_ID;

  console.log(`   📦 Uploading to Pinata...`);

  const fileBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([fileBuffer]);
  const file = new File([blob], `parity-10y-preview-${nftId}.png`, { type: 'image/png' });

  const upload = await uploadFile(
    { pinataJwt: PINATA_JWT },
    file,
    'public',
    {
      metadata: {
        name: `parity-10y-preview-${nftId}.png`
      },
      ...(PINATA_GROUP_ID && { groupId: PINATA_GROUP_ID })
    }
  );

  const ipfsUrl = `ipfs://${upload.cid}`;
  console.log(`   ✅ Uploaded to IPFS: ${ipfsUrl}`);
  console.log(`   📌 CID: ${upload.cid}`);

  return ipfsUrl;
}
