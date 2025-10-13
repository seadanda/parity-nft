'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { calculateTierFromHash } from '@/lib/tier-calculator';

const TierViewer = dynamic(() => import('@/components/TierViewer'), {
  ssr: false,
});

export default function ViewNFTPage() {
  const params = useParams();
  let hash = params.hash as string;

  // Normalize hash - add 0x prefix if missing
  if (hash && !hash.startsWith('0x')) {
    hash = '0x' + hash;
  }

  // Validate hash format
  const isValidHash = hash && /^0x[0-9a-fA-F]{64}$/.test(hash);

  if (!isValidHash) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Invalid Hash</h1>
          <p className="text-gray-400">
            Expected 64-character hex hash (with or without 0x prefix)
          </p>
        </div>
      </div>
    );
  }

  // Calculate tier from hash (deterministic - no database needed)
  const tierInfo = calculateTierFromHash(hash);
  const COLLECTION_ID = parseInt(process.env.NEXT_PUBLIC_COLLECTION_ID || '669');

  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      {/* Content */}
      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main Viewer */}
          <div className="overflow-hidden mb-8">
            <div className="aspect-square max-w-3xl mx-auto">
              <TierViewer
                glassColor={tierInfo.glassColor}
                glowColor={tierInfo.glowColor}
                autoRotate={true}
                loadHDR={true}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Tier Info */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
                Tier Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Tier</p>
                  <p className="text-lg font-semibold text-white">{tierInfo.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rarity</p>
                  <p className="text-lg font-semibold text-white">{tierInfo.rarity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Collection</p>
                  <p className="text-lg font-mono text-white">#{COLLECTION_ID}</p>
                </div>
              </div>
            </div>

            {/* Hash Info */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
                Hash
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Deterministic ID</p>
                  <p className="text-sm font-mono text-gray-300 break-all">
                    {hash}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 italic">
                    This NFT is generated deterministically from its hash. The same hash will
                    always produce the same tier, colors, and appearance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="max-w-3xl mx-auto mt-6">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
                Color Palette
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Glass Color</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 border-gray-700"
                      style={{ backgroundColor: tierInfo.glassColor }}
                    />
                    <p className="text-sm font-mono text-gray-300">{tierInfo.glassColor}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Glow Color</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 border-gray-700"
                      style={{ backgroundColor: tierInfo.glowColor }}
                    />
                    <p className="text-sm font-mono text-gray-300">{tierInfo.glowColor}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center mt-8">
            <a
              href="/gallery"
              className="px-6 py-3 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded-lg font-medium transition-colors"
            >
              Back to Gallery
            </a>
            <a
              href="/mint"
              className="px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg font-medium transition-colors"
            >
              Mint Your Own
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
