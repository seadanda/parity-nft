'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export default function HeroViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

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
    let logoMesh: any;
    let logoGlowMesh: any;
    let iridescenceMesh: any;
    let animationFrameId: number;

    const params = {
      // Glass material properties
      glassColor: '#000000', // Obelisk
      transparency: 0.24,
      roughness: 0.236,
      metalness: 0.0,
      transmission: 0.95,
      ior: 1.4,

      // Glow effect
      glowIntensity: 0.1,
      glowColor: '#ffffff', // Obelisk
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
    };

    function init() {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Create scene
      scene = new THREE.Scene();

      // Create camera
      camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
      camera.position.set(0, 0, 5);

      // Renderer with transparent background (EXACT from hero.js)
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerWidth, containerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0); // Transparent background
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // Setup lighting
      setupLighting();

      // Load HDR environment map
      loadHDREnvironment();

      // Load 3D logo
      loadLogo();

      // Setup post-processing for glow effect
      setupPostProcessing();

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
      const hdrLoader = new HDRLoader();
      hdrLoader.load('/royal_esplanade_2k.hdr', function (texture: any) {
        // Use PMREM to prefilter and gently blur the environment
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envRT = pmremGenerator.fromEquirectangular(texture);
        scene.environment = envRT.texture;
        texture.dispose();
        pmremGenerator.dispose();
      }, undefined, function (error: any) {
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
      const cameraY = radius * 3.0;
      camera.position.set(0, cameraY, 0);
      camera.near = Math.max(0.1, radius * 0.01);
      camera.far = Math.max(5000, radius * 100.0);
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
          uniform float uThickness;
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
      // Disabled - using direct rendering for transparency
      // composer = new EffectComposer(renderer);
      // const renderPass = new RenderPass(scene, camera);
      // composer.addPass(renderPass);
      // const bloomPass = new UnrealBloomPass(
      //   new THREE.Vector2(container.clientWidth, container.clientHeight),
      //   params.bloomStrength,
      //   params.bloomRadius,
      //   params.bloomThreshold
      // );
      // composer.addPass(bloomPass);
    }

    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate only the logo around Z axis (glow/iridescence inherit as children)
      if (logoMesh && params.autoRotate) {
        const delta = 0.005 * params.rotationSpeed;
        logoMesh.rotation.z += delta;
      }

      // Direct rendering (no post-processing) for transparency support
      renderer.render(scene, camera);
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
}
