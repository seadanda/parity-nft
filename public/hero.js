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
    let logoMesh, logoGlowMesh, iridescenceMesh;
    let hdriTexture;

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


    function init() {
        // Create scene
        scene = new THREE.Scene();

        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);

        // Renderer with transparent background
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0); // Transparent background
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

        // No starfield or background - transparent only

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

        applyTier({ name: 'Obelisk Ultra', glass: '#000000', glow: '#ed1d64', weight: 0.5 })

        // Start animation loop
        animate();
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
        rgbeLoader.load('./royal_esplanade_2k.hdr', function (texture) {
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
        loader.load('./logo3d-joined_uv.glb', function (gltf) {
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
        });
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


    function animate() {
        requestAnimationFrame(animate);

        // Update controls (no camera auto-rotate)
        controls.update();

        // Rotate only the logo around Z axis (carousel-like)
        if (logoMesh && params.autoRotate) {
            const delta = 0.005 * params.rotationSpeed;
            logoMesh.rotation.z += delta;
        }


        // Render with post-processing
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
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


    // Frame counter for delaying postMessage until render is stable
    let frameCount = 0;
    const FRAMES_BEFORE_MESSAGE = 60;

    // Export frameCount for screenshot detection
    window.frameCount = 0;


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
  })();
}