/**
 * Shared NFT rendering configuration and utilities
 * Used by both NFTCanvas component and IPFS viewer generation
 */

// DJB2 hash algorithm (from sketch-nobase64.js)
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Default rendering configuration matching NFTCanvas
 * These values are optimized for the glass/crystal effect
 */
export const DEFAULT_RENDER_CONFIG = {
  // Glass material properties
  transparency: 0.24,
  roughness: 0.236,
  metalness: 0.0,
  transmission: 0.95,
  ior: 1.4,

  // Glow effect
  glowIntensity: 0.1,
  bloomStrength: 1.4,
  bloomRadius: 0.43,
  bloomThreshold: 0.5,

  // Edge glow
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

  // Lighting
  ambientIntensity: 0.4,
  directionalIntensity: 1.0,

  // Environment
  envMapIntensity: 1.0,
  starCount: 15000,
  starSize: 2.0,
} as const;

/**
 * Shader code for edge glow effect using Fresnel
 */
export const EDGE_GLOW_SHADERS = {
  vertex: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragment: `
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
} as const;

/**
 * Shader code for iridescence effect with rainbow colors
 */
export const IRIDESCENCE_SHADERS = {
  vertex: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragment: `
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
} as const;

/**
 * Generate mint ID from tier information and date
 * Used for the stamp overlay
 */
export function generateMintId(
  tierName: string,
  glassColor: string,
  glowColor: string
): string {
  const d = new Date();
  const seed = `${tierName}|${glassColor}|${glowColor}|${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const h = hashString(seed);
  return h.toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Camera configuration for framing the logo
 */
export const CAMERA_CONFIG = {
  fov: 75,
  near: 0.1,
  far: 1000,
  distanceMultiplier: 3.0, // Camera distance = radius * this
  nearMultiplier: 0.01,
  farMultiplier: 100.0,
} as const;

/**
 * Starfield configuration
 */
export const STARFIELD_CONFIG = {
  minRadius: 300,
  maxRadius: 1000,
  color: 0x555555,
  opacity: 0.8,
} as const;

/**
 * Point light configuration
 */
export const POINT_LIGHTS_CONFIG = [
  { color: 0x4da6ff, intensity: 0.5, distance: 100, position: [10, 10, 10] as const },
  { color: 0xff4da6, intensity: 0.3, distance: 100, position: [-10, -10, 10] as const },
] as const;
