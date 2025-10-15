#!/usr/bin/env tsx
/**
 * Generate standalone HTML for IPFS
 * Usage: ipfs://CID/?hash=0x123...
 *
 * This script generates a standalone HTML file that embeds the NFTCanvas
 * rendering logic without React dependencies.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'ipfs-viewers');

// Read source files to inline
const tierCalculatorPath = join(process.cwd(), 'src/lib/tier-calculator.ts');
const nftRendererPath = join(process.cwd(), 'src/lib/nft-renderer.ts');

const tierCalculatorContent = readFileSync(tierCalculatorPath, 'utf-8');
const nftRendererContent = readFileSync(nftRendererPath, 'utf-8');

// Extract TIERS array
const tiersMatch = tierCalculatorContent.match(/export const TIERS = \[([\s\S]*?)\];/);
if (!tiersMatch || !tiersMatch[1]) throw new Error('Could not find TIERS array');
const tiersArray = tiersMatch[1];

// Extract render config
const renderConfigMatch = nftRendererContent.match(/export const DEFAULT_RENDER_CONFIG = ({[\s\S]*?}) as const;/);
if (!renderConfigMatch || !renderConfigMatch[1]) throw new Error('Could not find DEFAULT_RENDER_CONFIG');
const renderConfig = renderConfigMatch[1];

// Extract shader code
const edgeGlowMatch = nftRendererContent.match(/export const EDGE_GLOW_SHADERS = ({[\s\S]*?}) as const;/);
if (!edgeGlowMatch || !edgeGlowMatch[1]) throw new Error('Could not find EDGE_GLOW_SHADERS');
const edgeGlowShaders = edgeGlowMatch[1];

const iridescenceMatch = nftRendererContent.match(/export const IRIDESCENCE_SHADERS = ({[\s\S]*?}) as const;/);
if (!iridescenceMatch || !iridescenceMatch[1]) throw new Error('Could not find IRIDESCENCE_SHADERS');
const iridescenceShaders = iridescenceMatch[1];

async function generate() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parity 10 Years NFT</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #000; color: #fff; overflow: hidden; width: 100vw; height: 100vh; }
    #viewer-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    #stamp-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
    .info { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); z-index: 20; max-width: 300px; }
    .info h1 { font-size: 24px; margin-bottom: 8px; background: linear-gradient(135deg, #E81899, #9945FF, #14F195); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .info p { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
    .info .hash { font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.5); word-break: break-all; margin-top: 8px; }
    .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 5; }
    .spinner { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #E81899; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); padding: 12px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); z-index: 20; display: flex; gap: 15px; }
    .controls button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .controls button:hover { background: rgba(255,255,255,0.2); }
    .controls button.active { background: #E81899; border-color: #E81899; }
    .error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.3); padding: 30px; border-radius: 12px; max-width: 500px; }
    .error h2 { color: #ff4444; margin-bottom: 12px; }
    .error code { background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="loading" id="loading"><div class="spinner"></div><p>Loading...</p></div>
  <div class="info" id="info" style="display:none;">
    <h1>Parity 10 Years</h1>
    <p><strong>Tier:</strong> <span id="tier-name">-</span></p>
    <p><strong>Rarity:</strong> <span id="tier-rarity" style="font-weight:bold">-</span></p>
    <p class="hash">Hash: <span id="hash-display">-</span></p>
  </div>
  <div id="viewer-container"></div>
  <canvas id="stamp-canvas"></canvas>
  <div class="controls" id="controls" style="display:none;">
    <button id="toggle-rotation" class="active">Auto-Rotate</button>
    <button id="reset-camera">Reset</button>
  </div>

  <script type="module">
    import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
    import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
    import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/RGBELoader.js';
    import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/UnrealBloomPass.js';

    // Inline shared configuration and utilities
    const TIERS = [${tiersArray}];
    const DEFAULT_RENDER_CONFIG = ${renderConfig};
    const EDGE_GLOW_SHADERS = ${edgeGlowShaders};
    const IRIDESCENCE_SHADERS = ${iridescenceShaders};

    class SeededRandom {
      constructor(seed) { this.seed = seed; }
      next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
    }

    function hashToSeed(hash) {
      let seed = 0;
      for (let hl = 0; hl < 60; hl += 12) seed += parseInt(hash.substring(hl, hl + 12), 16);
      return seed;
    }

    function calculateTier(hash) {
      const rng = new SeededRandom(hashToSeed(hash));
      const total = TIERS.reduce((sum, t) => sum + t.weight, 0);
      const roll = rng.next() * total;
      let acc = 0;
      for (const tier of TIERS) {
        acc += tier.weight;
        if (roll <= acc) return tier;
      }
      return TIERS[0];
    }

    function hashString(str) {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
      return hash >>> 0;
    }

    function generateMintId(tierName, glassColor, glowColor) {
      const d = new Date();
      const seed = \`\${tierName}|\${glassColor}|\${glowColor}|\${d.getFullYear()}-\${d.getMonth() + 1}-\${d.getDate()}\`;
      const h = hashString(seed);
      return h.toString(16).padStart(8, '0').toUpperCase();
    }

    function getHash() {
      return new URLSearchParams(window.location.search).get('hash') || new URLSearchParams(window.location.hash.substring(1)).get('hash');
    }

    function showError(msg) {
      document.getElementById('loading').innerHTML = \`<div class="error"><h2>⚠️ Error</h2><p>\${msg}</p><p style="margin-top:12px"><strong>Usage:</strong> <code>?hash=0x...</code></p></div>\`;
    }

    let scene, camera, renderer, composer, starField, logoMesh, autoRotate = true;
    const config = { ...DEFAULT_RENDER_CONFIG };

    async function init() {
      const hash = getHash();
      if (!hash) return showError('No hash parameter provided.');
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return showError('Invalid hash format.');

      const tier = calculateTier(hash);
      Object.assign(config, tier, { hash });

      document.getElementById('tier-name').textContent = config.name;
      document.getElementById('tier-rarity').textContent = config.rarity;
      document.getElementById('tier-rarity').style.color = config.glowColor;
      document.getElementById('hash-display').textContent = hash;
      document.getElementById('info').style.display = 'block';
      document.getElementById('controls').style.display = 'flex';

      // Scene setup
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 5);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      document.getElementById('viewer-container').appendChild(renderer.domElement);

      // Post-processing
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        config.bloomStrength,
        config.bloomRadius,
        config.bloomThreshold
      ));

      // Lighting
      scene.add(new THREE.AmbientLight(0x404040, config.ambientIntensity));
      const directionalLight = new THREE.DirectionalLight(0xffffff, config.directionalIntensity);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      const pointLight1 = new THREE.PointLight(0x4da6ff, 0.5, 100);
      pointLight1.position.set(10, 10, 10);
      scene.add(pointLight1);
      const pointLight2 = new THREE.PointLight(0xff4da6, 0.3, 100);
      pointLight2.position.set(-10, -10, 10);
      scene.add(pointLight2);

      // Starfield
      const starVertices = [];
      const minRadius = 300, maxRadius = 1000;
      for (let i = 0; i < config.starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        starVertices.push(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      starField = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0x555555, size: config.starSize, transparent: true, opacity: 0.8, depthWrite: false
      }));
      starField.renderOrder = -1;
      scene.add(starField);

      // HDR environment
      try {
        const hdr = await new RGBELoader().loadAsync('https://parity-nft.seadanda.dev/studio_small_09_1k.hdr');
        const pmremGen = new THREE.PMREMGenerator(renderer);
        pmremGen.compileEquirectangularShader();
        const envRT = pmremGen.fromEquirectangular(hdr);
        scene.environment = envRT.texture;
        hdr.dispose();
        pmremGen.dispose();
      } catch (e) { console.warn('HDR failed:', e); }

      // Load logo
      try {
        const gltf = await new GLTFLoader().loadAsync('https://parity-nft.seadanda.dev/parity_logo_3d_v006.glb');
        logoMesh = gltf.scene;

        // Apply glass material
        logoMesh.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color(config.glassColor),
              metalness: config.metalness,
              roughness: config.roughness,
              transmission: config.transmission,
              ior: config.ior,
              transparent: true,
              opacity: 1.0,
              emissive: new THREE.Color(config.glassColor),
              emissiveIntensity: config.glowIntensity,
              envMapIntensity: config.envMapIntensity,
              clearcoat: 1.0,
              clearcoatRoughness: 0.1
            });
          }
        });

        // Center and frame
        logoMesh.scale.setScalar(1);
        logoMesh.position.set(0, 0, 0);
        logoMesh.rotation.set(0, 0, 0);

        const box = new THREE.Box3().setFromObject(logoMesh);
        const size = new THREE.Vector3(), center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        logoMesh.position.sub(center);

        const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1.0;
        camera.position.set(0, radius * 3.0, 0);
        camera.near = Math.max(0.1, radius * 0.01);
        camera.far = Math.max(5000, radius * 100.0);
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);

        scene.add(logoMesh);

        // Edge glow overlay
        if (config.edgeGlowEnabled) {
          const glowMesh = logoMesh.clone(true);
          const glowMat = new THREE.ShaderMaterial({
            uniforms: {
              uColor: { value: new THREE.Color(config.edgeGlowSyncWithGlass ? config.glassColor : config.glowColor) },
              uOpacity: { value: config.edgeGlowOpacity },
              uFresnelPower: { value: config.edgeGlowFresnelPower },
              uFresnelIntensity: { value: config.edgeGlowFresnelIntensity }
            },
            vertexShader: EDGE_GLOW_SHADERS.vertex,
            fragmentShader: EDGE_GLOW_SHADERS.fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
          });
          glowMesh.traverse((child) => { if (child.isMesh) child.material = glowMat; });
          glowMesh.scale.setScalar(config.edgeGlowScale);
          glowMesh.renderOrder = 1;
          logoMesh.add(glowMesh);
        }

        // Iridescence overlay
        if (config.iridescenceEnabled) {
          const iriMesh = logoMesh.clone(true);
          const iriMat = new THREE.ShaderMaterial({
            uniforms: {
              uThickness: { value: config.iridescenceThickness },
              uIntensity: { value: config.iridescenceIntensity }
            },
            vertexShader: IRIDESCENCE_SHADERS.vertex,
            fragmentShader: IRIDESCENCE_SHADERS.fragment,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide
          });
          iriMesh.traverse((child) => {
            if (child.userData?.isGlow) { if (child.parent) child.parent.remove(child); return; }
            if (child.isMesh) child.material = iriMat;
          });
          iriMesh.scale.setScalar(1.001);
          iriMesh.renderOrder = 2;
          logoMesh.add(iriMesh);
        }

        document.getElementById('loading').style.display = 'none';
      } catch (e) { console.error('Model failed:', e); }

      drawStamp();
      animate();
      window.addEventListener('resize', onResize);
    }

    function drawStamp() {
      if (!config.name) return;
      const canvas = document.getElementById('stamp-canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Only generate mint ID if hash exists (will always exist in IPFS viewer)
      const mintId = config.hash ? generateMintId(config.name, config.glassColor, config.glowColor) : null;

      const scale = Math.min(canvas.width, canvas.height) / 600;
      const pad = 14 * scale;
      const line1 = \`Tier: \${config.name}\`;
      const line2 = mintId ? \`Mint: \${mintId}\` : null;
      const line3 = \`Parity • 10 Years\`;
      const x = window.innerWidth - pad;
      const y = window.innerHeight - pad;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      // Shadow glow - scaled
      ctx.shadowColor = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = 6 * scale;

      // Big bold title - scaled
      ctx.font = \`900 \${32 * scale}px "Unbounded", Arial, sans-serif\`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(line3, x, y);

      // Tier - scaled
      ctx.font = \`\${13 * scale}px Arial\`;
      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.fillText(line1, x, y - 40 * scale);

      // Mint id - only show if hash exists (actual minted NFT)
      if (line2) {
        ctx.font = \`\${12 * scale}px Arial\`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(line2, x, y - 60 * scale);
      }

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    function animate() {
      requestAnimationFrame(animate);
      if (autoRotate && logoMesh) logoMesh.rotation.z += 0.005 * config.rotationSpeed;
      if (starField) starField.rotation.z += 0.0003;
      composer.render();
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      drawStamp();
    }

    document.getElementById('toggle-rotation').addEventListener('click', (e) => {
      autoRotate = !autoRotate;
      e.target.classList.toggle('active');
    });

    document.getElementById('reset-camera').addEventListener('click', () => {
      camera.position.set(0, 0, 2.5);
      camera.lookAt(0, 0, 0);
      if (logoMesh) logoMesh.rotation.z = 0;
    });

    init();
  </script>
</body>
</html>`;

  const filepath = join(OUTPUT_DIR, 'viewer.html');
  writeFileSync(filepath, html, 'utf-8');

  console.log(`✅ Generated: viewer.html (${(html.length / 1024).toFixed(2)} KB)`);
  console.log(`\n📦 Usage: ipfs://CID/?hash=0x123...`);
  console.log(`\n⚠️  Local testing: Must serve via HTTP, not file://`);
  console.log(`   Run: npx serve ipfs-viewers`);
  console.log(`   Then: http://localhost:3000/viewer.html?hash=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n`);
}

generate().catch(console.error);
