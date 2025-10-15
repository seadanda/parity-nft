'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { calculateTierFromHash } from '@/lib/tier-calculator';
import {
  DEFAULT_RENDER_CONFIG,
  EDGE_GLOW_SHADERS,
  IRIDESCENCE_SHADERS,
  hashString,
  generateMintId,
  CAMERA_CONFIG,
  STARFIELD_CONFIG,
  POINT_LIGHTS_CONFIG,
} from '@/lib/nft-renderer';

interface NFTCanvasProps {
  // Primary method: Pass hash and tier is calculated automatically
  hash?: string;

  // Legacy method: Pass colors directly (backwards compat)
  glassColor?: string;
  glowColor?: string;
  tierName?: string;

  // Common props
  autoRotate?: boolean;
  loadHDR?: boolean; // Whether to load the large HDR file (default: false for performance)
  className?: string;
}


export default function NFTCanvas({
  hash,
  glassColor: glassColorProp,
  glowColor: glowColorProp,
  tierName: tierNameProp,
  autoRotate = true,
  loadHDR = true,
  className = '',
}: NFTCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stampCanvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate tier from hash if provided, otherwise use props
  const tierInfo = hash ? calculateTierFromHash(hash) : null;
  const glassColor = tierInfo?.glassColor ?? glassColorProp ?? '#ffffff';
  const glowColor = tierInfo?.glowColor ?? glowColorProp ?? '#ffffff';
  const tierName = tierInfo?.name ?? tierNameProp;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Wait for container to have dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      return;
    }

    // Application state variables
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let composer: EffectComposer;
    let logoMesh: any;
    let logoGlowMesh: any;
    let iridescenceMesh: any;
    let starField: THREE.Points;
    let animationFrameId: number;

    // Configuration parameters - merge defaults with component-specific values
    const params = {
      ...DEFAULT_RENDER_CONFIG,
      glassColor: glassColor,
      glowColor: glowColor,
      autoRotate: autoRotate,
    };

    function init() {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Create scene
      scene = new THREE.Scene();

      // Create camera
      camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.fov, containerWidth / containerHeight, CAMERA_CONFIG.near, CAMERA_CONFIG.far);
      camera.position.set(0, 0, 5);

      // Renderer with black background for starfield
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(containerWidth, containerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 1); // Black background for stars
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // Setup lighting
      setupLighting();

      // Load HDR environment map (optional for performance)
      if (loadHDR) {
        loadHDREnvironment();
      }

      // Load 3D logo
      loadLogo();

      // Setup post-processing for glow effect
      setupPostProcessing();

      // Add starfield
      createStarfield();

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
      POINT_LIGHTS_CONFIG.forEach(config => {
        const light = new THREE.PointLight(config.color, config.intensity, config.distance);
        const [x, y, z] = config.position;
        light.position.set(x, y, z);
        scene.add(light);
      });
    }

    function loadHDREnvironment() {
      const rgbeLoader = new RGBELoader();
      rgbeLoader.load('/royal_esplanade_2k.hdr', function (texture) {
        // Use PMREM to prefilter and gently blur the environment
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envRT = pmremGenerator.fromEquirectangular(texture);
        scene.environment = envRT.texture;
        texture.dispose();
        pmremGenerator.dispose();
      }, undefined, function (error) {
        console.error('Failed to load HDR environment:', error);
      });
    }

    function loadLogo() {
      const loader = new GLTFLoader();
      loader.load('/logo3d-joined_uv.glb', function (gltf) {
        logoMesh = gltf.scene;

        // Apply glass-ice material to all meshes
        logoMesh.traverse(function (child: any) {
          if (child.isMesh) {
            updateGlassMaterial(child);
          }
        });

        // Ensure clean transform for framing
        logoMesh.scale.setScalar(1);
        logoMesh.position.set(0, 0, 0);
        logoMesh.rotation.set(0, 0, 0);

        scene.add(logoMesh);

        // Center the logo and frame camera
        frameToObject(logoMesh);

        // Create simple edge glow overlay
        createEdgeGlow();
      }, undefined, function (error) {
        console.error('Failed to load logo GLB file:', error);
      });
    }

    function frameToObject(object: any) {
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
      const cameraY = radius * CAMERA_CONFIG.distanceMultiplier;
      camera.position.set(0, cameraY, 0);
      camera.near = Math.max(CAMERA_CONFIG.near, radius * CAMERA_CONFIG.nearMultiplier);
      camera.far = Math.max(5000, radius * CAMERA_CONFIG.farMultiplier);
      camera.updateProjectionMatrix();

      // Ensure camera looks at origin
      camera.lookAt(0, 0, 0);
    }

    function createGlassMaterial() {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(params.glassColor),
        metalness: params.metalness,
        roughness: params.roughness,
        transmission: params.transmission,
        ior: params.ior,
        transparent: true,
        opacity: 1.0,
        emissive: new THREE.Color(params.glassColor),
        emissiveIntensity: params.glowIntensity,
        envMapIntensity: params.envMapIntensity,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
    }

    function updateGlassMaterial(mesh: any) {
      mesh.material = createGlassMaterial();
    }

    function createEdgeGlow() {
      if (!logoMesh) return;
      // Remove previous glow if any
      if (logoGlowMesh && logoGlowMesh.parent) {
        logoGlowMesh.parent.remove(logoGlowMesh);
      }
      if (!params.edgeGlowEnabled) return;

      // Clone hierarchy
      logoGlowMesh = logoMesh.clone(true);

      // Fresnel-based shader material for fuzzy, non-rectangular glow
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(params.edgeGlowSyncWithGlass ? params.glassColor : params.glowColor) },
          uOpacity: { value: params.edgeGlowOpacity },
          uFresnelPower: { value: params.edgeGlowFresnelPower },
          uFresnelIntensity: { value: params.edgeGlowFresnelIntensity }
        },
        vertexShader: EDGE_GLOW_SHADERS.vertex,
        fragmentShader: EDGE_GLOW_SHADERS.fragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
      });

      logoGlowMesh.userData.isGlow = true;
      logoGlowMesh.traverse(function (child: any) {
        if (child.isMesh) {
          child.material = glowMaterial;
          child.userData.isGlow = true;
        }
      });

      // Use local transform so it follows the logo
      logoGlowMesh.position.set(0, 0, 0);
      logoGlowMesh.rotation.set(0, 0, 0);
      logoGlowMesh.scale.copy(logoMesh.scale).multiplyScalar(params.edgeGlowScale);
      logoGlowMesh.renderOrder = 1;
      // Parent to the logo so it inherits rotation/position
      logoMesh.add(logoGlowMesh);

      // Recreate iridescence overlay if enabled
      if (params.iridescenceEnabled) createIridescenceOverlay();
    }

    function createIridescenceOverlay() {
      removeIridescenceOverlay();
      if (!logoMesh || !params.iridescenceEnabled) return;

      // Clone the logo hierarchy
      iridescenceMesh = logoMesh.clone(true);

      const iriMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uThickness: { value: params.iridescenceThickness },
          uIntensity: { value: params.iridescenceIntensity },
        },
        vertexShader: IRIDESCENCE_SHADERS.vertex,
        fragmentShader: IRIDESCENCE_SHADERS.fragment,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide
      });

      iridescenceMesh.traverse(function (child: any) {
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
      iridescenceMesh.scale.copy(logoMesh.scale).multiplyScalar(1.001);
      iridescenceMesh.renderOrder = 2;
      logoMesh.add(iridescenceMesh);
    }

    function removeIridescenceOverlay() {
      if (iridescenceMesh && iridescenceMesh.parent) {
        iridescenceMesh.parent.remove(iridescenceMesh);
        iridescenceMesh = null;
      }
    }

    function setupPostProcessing() {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        params.bloomStrength,
        params.bloomRadius,
        params.bloomThreshold
      );
      composer.addPass(bloomPass);
    }

    function createStarfield() {
      // Create a sparse outer star shell
      const starVertices = [];

      for (let i = 0; i < params.starCount; i++) {
          // Generate random point on sphere surface, then scale to random radius
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const radius = STARFIELD_CONFIG.minRadius + Math.random() * (STARFIELD_CONFIG.maxRadius - STARFIELD_CONFIG.minRadius);

          const x = radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.sin(phi) * Math.sin(theta);
          const z = radius * Math.cos(phi);

          starVertices.push(x, y, z);
      }

      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

      const starMaterial = new THREE.PointsMaterial({
          color: STARFIELD_CONFIG.color,
          size: params.starSize,
          transparent: true,
          opacity: STARFIELD_CONFIG.opacity,
          depthWrite: false
      });

      starField = new THREE.Points(starGeometry, starMaterial);
      starField.renderOrder = -1; // render behind
      scene.add(starField);
  }

    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate only the logo around Z axis (glow/iridescence inherit as children)
      if (logoMesh && params.autoRotate) {
        const delta = 0.005 * params.rotationSpeed;
        logoMesh.rotation.z += delta;
      }

      // Slowly rotate starfield
      if (starField) {
        starField.rotation.z += 0.0003;
      }

      // Render with post-processing (bloom effect)
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }

    // Handle resize
    const handleResize = () => {
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      if (composer) {
        composer.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    // Initialize
    init();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [glassColor, glowColor, autoRotate]);

  // Draw stamp overlay
  useEffect(() => {
    if (!stampCanvasRef.current || !tierName) return;

    const canvas = stampCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Only compute mint ID if there's a hash (actual minted NFT)
    const mintId = hash ? generateMintId(tierName, glassColor, glowColor) : null;

    const drawStamp = () => {
      const dpr = window.devicePixelRatio || 1;
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale everything based on container size (relative to a 600px base)
      const scale = Math.min(width, height) / 600;
      const pad = 14 * scale;
      const line1 = `Tier: ${tierName}`;
      const line2 = mintId ? `Mint: ${mintId}` : null;
      const line3 = `Parity • 10 Years`;
      const x = width - pad;
      const y = height - pad;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      // Shadow glow - scaled
      ctx.shadowColor = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = 6 * scale;

      // Big bold title - scaled
      ctx.font = `900 ${32 * scale}px "Unbounded", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(line3, x, y);

      // Tier - scaled
      ctx.font = `${13 * scale}px Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.fillText(line1, x, y - 40 * scale);

      // Mint id - only show if hash exists (actual minted NFT)
      if (line2) {
        ctx.font = `${12 * scale}px Arial`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(line2, x, y - 60 * scale);
      }

      // Reset shadow
      ctx.shadowBlur = 0;
    };

    drawStamp();

    const handleResize = () => drawStamp();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [hash, tierName, glassColor, glowColor]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {tierName && (
        <canvas
          ref={stampCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
