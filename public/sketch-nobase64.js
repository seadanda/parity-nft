
// P5.js wrapper for Three.js NFT viewer
// This provides p5 API compliance while running Three.js underneath

// Define p5.js API functions
function createCanvas(w, h) {
    return { parent: function() {} };
  }
  
  function setup() {
    // Initialize Three.js viewer
    console.log('setup() called, initializing Three.js');
    initThreeJS();
  }
  
  function initThreeJS() {
    // Three.js implementation embedded below
    (function () {
      'use strict';
  
      // Application state variables
      let scene, camera, renderer, controls, composer;
      let logoMesh, logoGlowMesh, starField, iridescenceMesh;
      let hdriTexture;
      let seedValue = null;
      let seededRng = null;
      let mintId;
  
      // Configuration parameters
      const params = {
          // Glass material properties
          glassColor: '#4da6ff',
          transparency: 0.24,
          roughness: 0.236,
          metalness: 0.0,
          transmission: 0.95,
          // thickness: 0.94, // Not supported in Three.js r128
          ior: 1.4,
  
          // Glow effect
          glowIntensity: 0.1,
          glowColor: '#4da6ff',
          bloomStrength: 1.4,
          bloomRadius: 0.43,
          bloomThreshold: 0.5,
          edgeGlowEnabled: true,
          edgeGlowOpacity: 1.0,
          edgeGlowScale: 1.03,
          edgeGlowSyncWithGlass: false,
          edgeGlowFresnelPower: 4.4,
          edgeGlowFresnelIntensity: 2.0,
          // Iridescence
          iridescenceEnabled: true,
          iridescenceIntensity: 0.7,
          iridescenceThickness: 600.0,
  
          // Animation
          rotationSpeed: 0.5,
          autoRotate: true,
  
  
          // Lighting
          ambientIntensity: 0.4,
          directionalIntensity: 1.0,
  
          // Environment
          envMapIntensity: 1.0,
          starCount: 15000,
          starSize: 2.0,
  
          // Tier selection (for GUI)
          currentTier: 'Bronze'
      };
  
      // Seeded random number generator for deterministic NFT generation
      class SeededRandom {
          constructor(seed) {
              this.seed = seed;
          }
  
          // Mulberry32 PRNG - fast and high quality
          next() {
              let t = this.seed += 0x6D2B79F5;
              t = Math.imul(t ^ t >>> 15, t | 1);
              t ^= t + Math.imul(t ^ t >>> 7, t | 61);
              return ((t ^ t >>> 14) >>> 0) / 4294967296;
          }
      }
  
      function hashString(str) {
          // DJB2 hash algorithm
          let hash = 5381;
          for (let i = 0; i < str.length; i++) {
              hash = ((hash << 5) + hash) + str.charCodeAt(i);
          }
          return hash >>> 0; // Convert to unsigned 32-bit integer
      }
  
      // KodaDot standard hash-to-seed conversion
      // Matches the algorithm used by KodaDot platform
      function hashToSeed(hash) {
          // Validate hash format: must be 66 characters (0x + 64 hex)
          if (!hash || typeof hash !== 'string') {
              console.error('Invalid hash: must be a string');
              return null;
          }
  
          if (hash.length !== 66) {
              console.error(`Invalid hash length: ${hash.length} (expected 66)`);
              return null;
          }
  
          if (!hash.startsWith('0x')) {
              console.error('Invalid hash format: must start with 0x');
              return null;
          }
  
          // Validate hex characters (case-insensitive)
          const hexPart = hash.substring(2);
          if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
              console.error('Invalid hash: must contain only hexadecimal characters after 0x');
              return null;
          }
  
          // KodaDot's standard algorithm: sum 5 chunks of 12 hex chars each
          let seed = 0;
          for (let hl = 0; hl < 60; hl = hl + 12) {
              seed += parseInt(hash.substring(hl, hl + 12), 16);
          }
  
          return seed;
      }
  
      // Optional URL param overrides for external control (e.g., ?stars=4000&starSize=1.2&hash=abc123)
      (function applyUrlOverrides() {
          try {
              const usp = new URLSearchParams(window.location.search);
  
              // Check for screenshot mode (disable rotation for image capture)
              if (usp.has('screenshot')) {
                  params.autoRotate = false;
                  // Export flag for Puppeteer to detect
                  window.SCREENSHOT_MODE = true;
              }
  
              if (usp.has('stars')) {
                  const n = parseInt(usp.get('stars'), 10);
                  if (!isNaN(n)) {
                      // Clamp to reasonable bounds
                      params.starCount = Math.max(100, Math.min(100000, n));
                  }
              }
              if (usp.has('starSize')) {
                  const s = parseFloat(usp.get('starSize'));
                  if (!isNaN(s)) {
                      params.starSize = Math.max(0.1, Math.min(10.0, s));
                  }
              }
              // Check for hash parameter for deterministic generation
              if (usp.has('hash')) {
                  seedValue = usp.get('hash');
                  if (seedValue === null) {
                      seedValue = DEFAULT_HASH;
                  }
                  const numericSeed = hashToSeed(seedValue);
                  seededRng = new SeededRandom(numericSeed);
              }
  
              // Check for direct tier parameter (for grid display)
              // WARNING: This bypasses randomization - use only for showcase grid
              if (usp.has('tier')) {
                  const requestedTier = usp.get('tier').trim();
                  // Sanitize: only allow alphanumeric, spaces, and safe characters
                  if (/^[a-zA-Z0-9\s]+$/.test(requestedTier)) {
                      params.forcedTier = requestedTier;
                      console.log('Forced tier mode:', requestedTier);
                  } else {
                      console.warn('Invalid tier parameter format - using random');
                  }
              }
          } catch (e) { /* no-op */ }
      })();
  
      function init() {
          // Create scene
          scene = new THREE.Scene();
  
          // Create camera
          camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          camera.position.set(0, 0, 5);
  
          // Renderer
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.0;
          renderer.outputEncoding = THREE.sRGBEncoding;
          renderer.physicallyCorrectLights = true;
          document.getElementById('container').appendChild(renderer.domElement);
  
          // Create controls
          controls = new THREE.OrbitControls(camera, renderer.domElement);
          // Disable all interactions for fixed view
          controls.enabled = false;
          controls.enableDamping = false;
          controls.enableRotate = false;
          controls.enableZoom = false;
          controls.enablePan = false;
  
          // Create starfield background
          createStarField();
  
          // No background sphere; starfield will be the backdrop
  
          // Setup lighting
          setupLighting();
  
          // Load HDR environment map
          loadHDREnvironment();
  
          // Load 3D logo
          loadLogo();
  
          // Setup post-processing for glow effect
          setupPostProcessing();
  
          // Handle window resize
          window.addEventListener('resize', onWindowResize, false);
  
          // Pick a tier: forced (from URL), random, or deterministic
          // SECURITY NOTE: ?tier= bypasses randomization but is DISPLAY ONLY
          // On-chain NFT metadata is the source of truth, not URL parameters
          if (params.forcedTier) {
              const tier = getTierByName(params.forcedTier);
              if (tier) {
                  applyTier(tier);
              } else {
                  console.warn('Unknown tier:', params.forcedTier);
                  randomizeTier();
              }
          } else {
              randomizeTier();
          }
  
          // Start animation loop
          animate();
  
          // Initialize mint stamp
          initStamp();
      }
  
      function createStarField() {
          // Create a sparse outer star shell between radius 300-1000
          const starVertices = [];
          const minRadius = 300;
          const maxRadius = 1000;
  
          for (let i = 0; i < (params.starCount || 5000); i++) {
              // Generate random point on sphere surface, then scale to random radius
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(2 * Math.random() - 1);
              const radius = minRadius + Math.random() * (maxRadius - minRadius);
  
              const x = radius * Math.sin(phi) * Math.cos(theta);
              const y = radius * Math.sin(phi) * Math.sin(theta);
              const z = radius * Math.cos(phi);
  
              starVertices.push(x, y, z);
          }
  
          const starGeometry = new THREE.BufferGeometry();
          starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  
          const starMaterial = new THREE.PointsMaterial({
              color: 0x555555,
              size: params.starSize || 0.9,
              transparent: true,
              opacity: 0.8,
              depthWrite: false
          });
  
          starField = new THREE.Points(starGeometry, starMaterial);
          starField.renderOrder = -1; // render behind
          scene.add(starField);
      }
  
      function setupLighting() {
          // Ambient light
          const ambientLight = new THREE.AmbientLight(0x404040, params.ambientIntensity);
          scene.add(ambientLight);
  
          // Directional light
          const directionalLight = new THREE.DirectionalLight(0xffffff, params.directionalIntensity);
          directionalLight.position.set(5, 5, 5);
          scene.add(directionalLight);
  
          // Point lights for extra illumination
          const pointLight1 = new THREE.PointLight(0x4da6ff, 0.5, 100);
          pointLight1.position.set(10, 10, 10);
          scene.add(pointLight1);
  
          const pointLight2 = new THREE.PointLight(0xff4da6, 0.3, 100);
          pointLight2.position.set(-10, -10, 10);
          scene.add(pointLight2);
      }
  
      function loadHDREnvironment() {
          const rgbeLoader = new THREE.RGBELoader();
          rgbeLoader.load(HDR_DATA_URL, function (texture) {
              // Use PMREM to prefilter and gently blur the environment
              const pmremGenerator = new THREE.PMREMGenerator(renderer);
              pmremGenerator.compileEquirectangularShader();
              const envRT = pmremGenerator.fromEquirectangular(texture);
              scene.environment = envRT.texture;
              // keep background transparent/black so starfield is visible
              // scene.background = envRT.texture; // intentionally not set
              hdriTexture = texture;
              texture.dispose();
              pmremGenerator.dispose();
              console.log('HDR environment (PMREM) loaded successfully');
          }, undefined, function (error) {
              console.error('Failed to load HDR environment:', error);
              console.warn('Using fallback environment (lighting may appear different)');
              // Fallback to basic environment
              createFallbackEnvironment();
          });
      }
  
      function createFallbackEnvironment() {
          const cubeTextureLoader = new THREE.CubeTextureLoader();
          const urls = [
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          ];
          scene.environment = cubeTextureLoader.load(urls);
      }
  
      function loadLogo() {
          const loader = new THREE.GLTFLoader();
          loader.load(GLB_DATA_URL, function (gltf) {
              logoMesh = gltf.scene;
  
              // Apply glass-ice material to all meshes
              logoMesh.traverse(function (child) {
                  if (child.isMesh) {
                      updateGlassMaterial(child);
                  }
              });
  
              // Ensure clean transform for framing
              logoMesh.scale.setScalar(1);
              logoMesh.position.set(0, 0, 0);
              logoMesh.rotation.set(0, 0, 0);
  
              scene.add(logoMesh);
              console.log('Logo loaded successfully');
  
              // Center the logo and frame camera + background sphere
              frameToObject(logoMesh);
  
              // Create simple edge glow overlay
              createEdgeGlow();
          }, undefined, function (error) {
              console.error('Failed to load logo GLB file:', error);
              console.warn('Using fallback geometry - ensure logo3d-joined_uv.glb is in the same directory');
              // Create a fallback geometry
              createFallbackLogo();
          });
      }
  
      function createFallbackLogo() {
          const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
          const material = createGlassMaterial();
          logoMesh = new THREE.Mesh(geometry, material);
          scene.add(logoMesh);
          console.log('Using fallback logo geometry');
          frameToObject(logoMesh);
          createEdgeGlow();
      }
  
      // Compute bounds, center object at origin, place camera on +Z and background sphere behind
      function frameToObject(object) {
          // Compute bounding box and center
          const box = new THREE.Box3().setFromObject(object);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
  
          // Re-center object to world origin for clean rotation about Z
          object.position.sub(center);
  
          // Approx radius (use max dimension / 2)
          const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1.0;
  
          // Position camera along +Y looking at origin
          const cameraY = radius * 3.0;
          camera.position.set(0, cameraY, 0);
          camera.near = Math.max(0.1, radius * 0.01);
          // Keep a large far plane so distant stars remain visible
          camera.far = Math.max(5000, radius * 100.0);
          camera.updateProjectionMatrix();
  
          // Controls disabled; ensure camera looks at origin
          camera.lookAt(0, 0, 0);
  
          // Size and position background sphere just behind the logo (further along -X)
          const desiredBgRadius = radius * 1.4;
          const baseSphereRadius = 3; // geometry radius reference
          const scale = desiredBgRadius / baseSphereRadius;
      }
  
      function createGlassMaterial() {
          return new THREE.MeshPhysicalMaterial({
              color: new THREE.Color(params.glassColor),
              metalness: params.metalness,
              roughness: params.roughness,
              transmission: params.transmission,
              // thickness is not supported in Three.js r128, removed
              ior: params.ior,
              transparent: true,
              // Use physical transmission for glass. Keep opacity at 1.
              opacity: 1.0,
              // Subtle emissive tied to glass color for consistent glow
              emissive: new THREE.Color(params.glassColor),
              emissiveIntensity: params.glowIntensity,
              envMapIntensity: params.envMapIntensity,
              clearcoat: 1.0,
              clearcoatRoughness: 0.1
          });
      }
  
      function updateGlassMaterial(mesh) {
          mesh.material = createGlassMaterial();
      }
  
      // Simple edge glow overlay using additive MeshBasicMaterial
      function createEdgeGlow() {
          if (!logoMesh) return;
          // Remove previous glow if any
          if (logoGlowMesh && logoGlowMesh.parent) {
              logoGlowMesh.parent.remove(logoGlowMesh);
          }
          if (!params.edgeGlowEnabled) return;
  
          let srcMesh = null;
          // If logoMesh is a group, clone as a single mesh using a merged approach is complex; instead clone hierarchy
          logoGlowMesh = logoMesh.clone(true);
  
          // Fresnel-based shader material for fuzzy, non-rectangular glow
          const glowMaterial = new THREE.ShaderMaterial({
              uniforms: {
                  uColor: { value: new THREE.Color(params.edgeGlowSyncWithGlass ? params.glassColor : params.glowColor) },
                  uOpacity: { value: params.edgeGlowOpacity },
                  uFresnelPower: { value: params.edgeGlowFresnelPower },
                  uFresnelIntensity: { value: params.edgeGlowFresnelIntensity }
              },
              vertexShader: `
                      varying vec3 vNormal;
                      varying vec3 vViewDir;
                      void main() {
                          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                          vNormal = normalize(normalMatrix * normal);
                          vViewDir = normalize(-mvPosition.xyz);
                          gl_Position = projectionMatrix * mvPosition;
                      }
                  `,
              fragmentShader: `
                      uniform vec3 uColor;
                      uniform float uOpacity;
                      uniform float uFresnelPower;
                      uniform float uFresnelIntensity;
                      varying vec3 vNormal;
                      varying vec3 vViewDir;
                      void main() {
                          float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
                          float fresnel = pow(1.0 - ndotv, uFresnelPower) * uFresnelIntensity;
                          vec3 col = uColor * fresnel;
                          gl_FragColor = vec4(col, fresnel * uOpacity);
                      }
                  `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.BackSide
          });
  
          logoGlowMesh.userData.isGlow = true;
          logoGlowMesh.traverse(function (child) {
              if (child.isMesh) {
                  child.material = glowMaterial;
                  child.userData.isGlow = true;
              }
          });
  
          // Use local transform so it follows the logo; slightly larger backface to create rim
          logoGlowMesh.position.set(0, 0, 0);
          logoGlowMesh.rotation.set(0, 0, 0);
          logoGlowMesh.scale.copy(logoMesh.scale).multiplyScalar(params.edgeGlowScale);
          logoGlowMesh.renderOrder = 1; // render after base
          // Parent to the logo so it inherits rotation/position
          logoMesh.add(logoGlowMesh);
  
          // Recreate iridescence overlay if enabled
          if (params.iridescenceEnabled) createIridescenceOverlay();
      }
  
      function updateEdgeGlow() {
          if (!logoGlowMesh) {
              if (params.edgeGlowEnabled) createEdgeGlow();
              return;
          }
          if (!params.edgeGlowEnabled) {
              if (logoGlowMesh.parent) logoGlowMesh.parent.remove(logoGlowMesh);
              logoGlowMesh = null;
              return;
          }
          logoGlowMesh.traverse(function (child) {
              if (child.isMesh && child.material && child.material.uniforms) {
                  const color = params.edgeGlowSyncWithGlass ? params.glassColor : params.glowColor;
                  child.material.uniforms.uColor.value.set(color);
                  child.material.uniforms.uOpacity.value = params.edgeGlowOpacity;
                  child.material.uniforms.uFresnelPower.value = params.edgeGlowFresnelPower;
                  child.material.uniforms.uFresnelIntensity.value = params.edgeGlowFresnelIntensity;
              }
          });
          // Update local scale relative to logo
          const s = params.edgeGlowScale;
          logoGlowMesh.scale.copy(logoMesh.scale).multiplyScalar(s);
  
          // Update iridescence uniforms if present
          updateIridescence();
      }
  
      function setupPostProcessing() {
          // Create composer for post-processing
          composer = new THREE.EffectComposer(renderer);
  
          // Add render pass
          const renderPass = new THREE.RenderPass(scene, camera);
          composer.addPass(renderPass);
  
          // Add bloom pass for glow effect
          const bloomPass = new THREE.UnrealBloomPass(
              new THREE.Vector2(window.innerWidth, window.innerHeight),
              params.bloomStrength,
              params.bloomRadius,
              params.bloomThreshold
          );
          composer.addPass(bloomPass);
      }
  
      function updateMaterials() {
          if (logoMesh) {
              logoMesh.traverse(function (child) {
                  if (child.isMesh) {
                      // Skip glow overlay meshes
                      if (child.userData && (child.userData.isGlow || child.userData.isIridescence)) return;
                      updateGlassMaterial(child);
                  }
              });
          }
      }
  
      function updateBloom() {
          if (composer && composer.passes[1]) {
              composer.passes[1].strength = params.bloomStrength;
              composer.passes[1].radius = params.bloomRadius;
              composer.passes[1].threshold = params.bloomThreshold;
          }
      }
  
      function updateControls() {
          if (controls) {
              // keep camera fixed; only logo rotation uses params.autoRotate
              controls.autoRotate = false;
              controls.autoRotateSpeed = params.rotationSpeed;
          }
      }
  
      function updateLighting() {
          scene.traverse(function (child) {
              if (child.isLight) {
                  if (child.type === 'AmbientLight') {
                      child.intensity = params.ambientIntensity;
                  } else if (child.type === 'DirectionalLight') {
                      child.intensity = params.directionalIntensity;
                  }
              }
          });
      }
  
      function updateStarField() {
          if (starField) {
              scene.remove(starField);
              createStarField();
          }
      }
  
      function animate() {
          requestAnimationFrame(animate);
  
          // Update controls (no camera auto-rotate)
          controls.update();
  
          // Rotate only the logo around Z axis (carousel-like)
          if (logoMesh && params.autoRotate) {
              const delta = 0.005 * params.rotationSpeed;
              logoMesh.rotation.z += delta;
          }
  
          // Make the stars circle subtly
          if (starField) {
              starField.rotation.z += 0.0003;
          }
  
          // Render with post-processing
          if (composer) {
              composer.render();
          } else {
              renderer.render(scene, camera);
          }
  
          // Draw on-canvas mint stamp
          drawStamp();
  
          // Send KodaDot message after initial frames (when render is stable)
          if (frameCount === FRAMES_BEFORE_MESSAGE) {
              postMessageKoda();
          }
          frameCount++;
          window.frameCount = frameCount;
      }
  
      function onWindowResize() {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          if (composer) {
              composer.setSize(window.innerWidth, window.innerHeight);
          }
      }
  
      // Initialize the scene when page loads
      window.addEventListener('load', init);
  
      // ===== Iridescent overlay (thin-film style, additive) =====
      function createIridescenceOverlay() {
          removeIridescenceOverlay();
          if (!logoMesh || !params.iridescenceEnabled) return;
          // Clone the logo hierarchy then remove any glow elements from the clone
          iridescenceMesh = logoMesh.clone(true);
          const iriMaterial = new THREE.ShaderMaterial({
              uniforms: {
                  uThickness: { value: params.iridescenceThickness },
                  uIntensity: { value: params.iridescenceIntensity },
              },
              vertexShader: `
                      varying vec3 vNormal;
                      varying vec3 vViewDir;
                      void main(){
                          vec4 mv = modelViewMatrix * vec4(position,1.0);
                          vNormal = normalize(normalMatrix * normal);
                          vViewDir = normalize(-mv.xyz);
                          gl_Position = projectionMatrix * mv;
                      }
                  `,
              fragmentShader: `
                      varying vec3 vNormal;
                      varying vec3 vViewDir;
                      uniform float uThickness; // nm-ish scaled
                      uniform float uIntensity;
                      // Simple rainbow palette
                      vec3 hsv2rgb(vec3 c){
                          vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1. );
                          rgb = rgb*rgb*(3.0-2.0*rgb);
                          return c.z * mix( vec3(1.0), rgb, c.y );
                      }
                      void main(){
                          float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
                          float fres = pow(1.0 - ndotv, 2.0);
                          // Map thickness + angle to hue band
                          float hue = fract(uThickness * 0.001 + fres * 0.8);
                          vec3 color = hsv2rgb(vec3(hue, 0.9, 1.0));
                          float alpha = fres * uIntensity;
                          gl_FragColor = vec4(color * alpha, alpha);
                      }
                  `,
              blending: THREE.AdditiveBlending,
              transparent: true,
              depthWrite: false,
              side: THREE.FrontSide
          });
          iridescenceMesh.traverse(function (child) {
              if (child.userData && child.userData.isGlow) {
                  if (child.parent) child.parent.remove(child);
                  return;
              }
              if (child.isMesh) {
                  child.material = iriMaterial;
                  child.userData = child.userData || {};
                  child.userData.isIridescence = true;
              }
          });
          iridescenceMesh.position.set(0, 0, 0);
          iridescenceMesh.rotation.set(0, 0, 0);
          iridescenceMesh.scale.copy(logoMesh.scale).multiplyScalar(1.001); // tiny inflation
          iridescenceMesh.renderOrder = 2;
          logoMesh.add(iridescenceMesh);
      }
  
      function updateIridescence() {
          if (!iridescenceMesh) { if (params.iridescenceEnabled) createIridescenceOverlay(); return; }
          iridescenceMesh.traverse(function (child) {
              if (child.isMesh && child.material && child.material.uniforms) {
                  child.material.uniforms.uThickness.value = params.iridescenceThickness;
                  child.material.uniforms.uIntensity.value = params.iridescenceIntensity;
              }
          });
      }
  
      function removeIridescenceOverlay() {
          if (iridescenceMesh && iridescenceMesh.parent) {
              iridescenceMesh.parent.remove(iridescenceMesh);
              iridescenceMesh = null;
          }
      }
  
      // ===== KodaDot Integration Functions =====
  
      // Extract detailed canvas information for KodaDot metadata
      function extractCanvasDetails(canvas) {
          if (!canvas) return { details: {}, base64Details: '' };
  
          // For WebGL canvas, we can't get 2D context properties
          // So we'll just return canvas dimensions and WebGL info
          const details = {
              width: canvas.width,
              height: canvas.height,
              pixelDensity: window.devicePixelRatio,
              canvasType: 'webgl',
              renderer: 'three.js'
          };
  
          // Try to get 2D context properties if this is a 2D canvas
          // (which it won't be for Three.js, but keeping for compatibility)
          try {
              const ctx = canvas.getContext("2d", { willReadFrequently: false });
              if (ctx) {
                  details.fillStyle = ctx.fillStyle;
                  details.strokeStyle = ctx.strokeStyle;
                  details.lineWidth = ctx.lineWidth;
                  details.globalAlpha = ctx.globalAlpha;
                  details.globalCompositeOperation = ctx.globalCompositeOperation;
                  details.transform = ctx.getTransform();
                  details.canvasType = '2d';
              }
          } catch (e) {
              // WebGL canvas, keep the WebGL details
          }
  
          // Compute base64 representation of the details
          const base64Details = btoa(JSON.stringify(details));
  
          return { details, base64Details };
      }
  
      // Send completion message to parent window (KodaDot platform)
      function postMessageKoda() {
          if (!seedValue) {
              console.log('Skipping KodaDot message - no hash provided');
              return;
          }
  
          const canvas = renderer.domElement;
          const { details, base64Details } = extractCanvasDetails(canvas);
  
          // Get numeric seed from hash
          const numericSeed = hashToSeed(seedValue);
  
          const message = {
              id: numericSeed,
              type: 'kodahash/render/completed',
              payload: {
                  version: "1.0",
                  hash: seedValue,
                  type: 'image/png',
                  image: canvas ? canvas.toDataURL('image/png') : null,
                  search: location.search,
                  attributes: {
                      tier: params.currentTier,
                      glassColor: params.glassColor,
                      glowColor: params.glowColor,
                      mintId: mintId,
                      ...details
                  },
                  base64Details,
              },
          };
  
          console.log('Sending KodaDot completion message:', message);
          window.parent.postMessage(message, '*');
      }
  
      // Frame counter for delaying postMessage until render is stable
      let frameCount = 0;
      const FRAMES_BEFORE_MESSAGE = 60;
  
      // Export frameCount for screenshot detection
      window.frameCount = 0;
  
      // ===== On-canvas Signature and Mint Stamp =====
      let stampCtx, stampCanvas;
      function initStamp() {
          stampCanvas = document.getElementById('stampCanvas');
          stampCtx = stampCanvas.getContext('2d');
          resizeStampCanvas();
          mintId = computeMintId();
          window.addEventListener('resize', resizeStampCanvas);
          // Kick off loading of Unbounded 900 so canvas can use it when ready
          if (document.fonts && document.fonts.load) {
              document.fonts.load('900 36px "Unbounded"');
          }
      }
  
      function resizeStampCanvas() {
          if (!stampCanvas) return;
          const dpr = window.devicePixelRatio || 1;
          stampCanvas.width = Math.floor(window.innerWidth * dpr);
          stampCanvas.height = Math.floor(window.innerHeight * dpr);
          stampCanvas.style.width = window.innerWidth + 'px';
          stampCanvas.style.height = window.innerHeight + 'px';
          if (stampCtx) stampCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
  
      function computeMintId() {
          // If we have a seed (deterministic mode), use it directly for mint ID
          if (seedValue) {
              const h = hashString(seedValue + '|' + params.currentTier);
              return h.toString(16).padStart(8, '0').toUpperCase();
          }
          // Otherwise, use tier + colors + date seed (day resolution)
          const d = new Date();
          const seed = `${params.currentTier}|${params.glassColor}|${params.glowColor}|${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          const h = hashString(seed);
          return h.toString(16).padStart(8, '0').toUpperCase();
      }
  
      function drawStamp() {
          if (!stampCtx) return;
          const pad = 14;
          const line1 = `Tier: ${params.currentTier}`;
          const line2 = `Mint: ${mintId}`;
          const line3 = `Parity • 10 Years`;
          const x = window.innerWidth - pad;
          const y = window.innerHeight - pad;
          stampCtx.clearRect(0, 0, stampCanvas.width, stampCanvas.height);
          stampCtx.textAlign = 'right';
          stampCtx.textBaseline = 'bottom';
          // Shadow glow
          stampCtx.shadowColor = 'rgba(255,255,255,0.35)';
          stampCtx.shadowBlur = 6;
          // Big bold title
          stampCtx.font = '900 32px "Unbounded", Arial, sans-serif';
          stampCtx.fillStyle = 'rgba(255,255,255,0.85)';
          stampCtx.fillText(line3, x, y);
          // Tier
          stampCtx.font = '13px Arial';
          stampCtx.fillStyle = 'rgba(255,255,255,0.70)';
          stampCtx.fillText(line1, x, y - 40);
          // Mint id
          stampCtx.font = '12px Arial';
          stampCtx.fillStyle = 'rgba(255,255,255,0.55)';
          stampCtx.fillText(line2, x, y - 60);
          // Reset shadow
          stampCtx.shadowBlur = 0;
      }
  
      // ---- Tier randomization helpers ----
      const TIERS = [
          { name: 'Silver', glass: '#ffffff', glow: '#ffffff', weight: 8 },
          { name: 'Graphite', glass: '#2b2f36', glow: '#7a8899', weight: 20 },
          { name: 'Bronze', glass: '#cd7f32', glow: '#755b5b', weight: 12 },
          { name: 'Copper', glass: '#e81308', glow: '#be8a46', weight: 8 },
          { name: 'Emerald', glass: '#17a589', glow: '#66ffc8', weight: 5 },
          { name: 'Sapphire', glass: '#1f5fff', glow: '#66a3ff', weight: 3 },
          { name: 'Green', glass: '#005908', glow: '#ddffdd', weight: 3 },
          { name: 'Ruby', glass: '#dc5e85', glow: '#ff6f91', weight: 2 },
          { name: 'Gold', glass: '#ffd700', glow: '#ffe680', weight: 1.5 },
          { name: 'Magenta', glass: '#ff00a8', glow: '#ff66cc', weight: 0.5 },
          { name: 'Obelisk', glass: '#000000', glow: '#ffffff', weight: 0.5 },
          { name: 'Obelisk Ultra', glass: '#000000', glow: '#ed1d64', weight: 0.5 }
      ];
  
      function pickWeightedTier() {
          const total = TIERS.reduce((s, t) => s + t.weight, 0);
          // Use seeded RNG if available (deterministic mode), otherwise Math.random()
          const randomValue = seededRng ? seededRng.next() : Math.random();
          let r = randomValue * total;
          for (const t of TIERS) { if ((r -= t.weight) <= 0) return t; }
          return TIERS[0];
      }
  
      function getTierByName(name) {
          return TIERS.find(t => t.name === name);
      }
  
      function applyTier(tier) {
          // Clear overlays that might carry previous tier visuals
          removeIridescenceOverlay();
          params.glassColor = tier.glass;
          params.glowColor = tier.glow;
          params.currentTier = tier.name;
          // Recalculate mint ID for new tier
          mintId = computeMintId();
          updateTierLabel(tier.name);
          updateMaterials();
          // Update existing edge glow instead of recreating
          if (params.edgeGlowEnabled) {
              if (!logoGlowMesh) {
                  createEdgeGlow();
              }
              updateEdgeGlow();
          }
          // Rebuild iridescence for the new tier
          if (params.iridescenceEnabled) createIridescenceOverlay();
      }
  
      function randomizeTier() {
          const tier = pickWeightedTier();
          applyTier(tier);
      }
  
      // Wire up on-page button
      document.addEventListener('DOMContentLoaded', function () {
          const btn = document.getElementById('randomizeColorsBtn');
          if (btn) btn.addEventListener('click', randomizeTier);
      });
  
      function updateTierLabel(name) {
          const el = document.getElementById('tierLabel');
          if (el) el.textContent = name;
  
          // Update accessibility info
          const tierInfo = document.getElementById('tier-info');
          if (tierInfo) {
              tierInfo.textContent = `Current NFT tier: ${name}. Mint ID: ${mintId || 'generating...'}`;
          }
      }

    })();
  }

// Auto-initialize when script loads (not using p5.js)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}