import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Singleton HDR loader - loads the file once and shares it across all viewers
class HDRLoader {
  private static instance: HDRLoader;
  private envTexture: THREE.Texture | null = null;
  private loading: boolean = false;
  private loadPromise: Promise<THREE.Texture> | null = null;

  private constructor() {}

  public static getInstance(): HDRLoader {
    if (!HDRLoader.instance) {
      HDRLoader.instance = new HDRLoader();
    }
    return HDRLoader.instance;
  }

  public async load(renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
    // If already loaded, return cached texture
    if (this.envTexture) {
      return this.envTexture;
    }

    // If currently loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.loading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      const rgbeLoader = new RGBELoader();
      rgbeLoader.load(
        '/royal_esplanade_2k.hdr',
        (texture) => {
          // Use PMREM to prefilter and gently blur the environment
          const pmremGenerator = new THREE.PMREMGenerator(renderer);
          pmremGenerator.compileEquirectangularShader();
          const envRT = pmremGenerator.fromEquirectangular(texture);

          this.envTexture = envRT.texture;

          // Cleanup
          texture.dispose();
          pmremGenerator.dispose();

          this.loading = false;
          resolve(this.envTexture);
        },
        undefined,
        (error) => {
          console.error('Failed to load HDR environment:', error);
          this.loading = false;
          this.loadPromise = null;
          reject(error);
        }
      );
    });

    return this.loadPromise;
  }

  public getTexture(): THREE.Texture | null {
    return this.envTexture;
  }

  public isLoaded(): boolean {
    return this.envTexture !== null;
  }

  public isLoading(): boolean {
    return this.loading;
  }
}

export const hdrLoader = HDRLoader.getInstance();
