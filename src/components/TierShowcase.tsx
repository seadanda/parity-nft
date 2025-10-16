'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, ArrowLeft } from 'lucide-react';
import { TIERS } from '@/lib/tiers';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

const NFTCanvas = dynamic(() => import('@/components/NFTCanvas'), {
  ssr: false,
});

export default function TierShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [fullscreenTier, setFullscreenTier] = useState<typeof TIERS[0] | null>(null);

  // Group tiers by rarity category
  const rarityGroups = [
    { label: 'Common', tiers: TIERS.filter(t => t.rarity === 'Common') },
    { label: 'Uncommon', tiers: TIERS.filter(t => t.rarity === 'Uncommon') },
    { label: 'Rare', tiers: TIERS.filter(t => t.rarity === 'Rare') },
    { label: 'Very Rare', tiers: TIERS.filter(t => t.rarity === 'Very Rare') },
    { label: 'Ultra Rare', tiers: TIERS.filter(t => t.rarity === 'Ultra Rare') },
    { label: 'Legendary', tiers: TIERS.filter(t => t.rarity === 'Legendary') },
  ];

  const activeTiers = rarityGroups[activeTab].tiers;

  // If fullscreen tier is active, show fullscreen view (same as /view/[hash] page)
  if (fullscreenTier) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0f]">
        {/* Content */}
        <div className="relative z-10 pt-24 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Main Viewer */}
            <div className="overflow-hidden mb-8">
              <div className="aspect-square max-w-3xl mx-auto">
                <NFTCanvas
                  glassColor={fullscreenTier.glassColor}
                  glowColor={fullscreenTier.glowColor}
                  tierName={fullscreenTier.name}
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
                    <p className="text-lg font-semibold text-white">{fullscreenTier.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rarity</p>
                    <p className="text-lg font-semibold text-white">{fullscreenTier.rarity}</p>
                  </div>
                </div>
              </div>

              {/* Hash Info */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
                  Preview
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 italic">
                      This is a tier preview. Mint an NFT to get a unique hash that will deterministically generate this tier's colors and appearance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setFullscreenTier(null)}
                className="px-6 py-3 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Tiers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rarity Tabs */}
      <div className="flex flex-wrap gap-3 justify-center">
        {rarityGroups.map((group, index) => (
          <button
            key={group.label}
            onClick={() => setActiveTab(index)}
            className={cn(
              'px-6 py-3 rounded-full font-semibold transition-all',
              activeTab === index
                ? 'bg-gradient-to-r from-parity-pink to-parity-purple text-white shadow-lg'
                : 'glass border border-white/20 text-text-muted hover:text-white hover:border-white/40'
            )}
          >
            {group.label}
            <span className="ml-2 text-xs opacity-70">({group.tiers.length})</span>
          </button>
        ))}
      </div>

      {/* NFT Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeTiers.map((tier) => (
          <Card key={tier.name} glass className="p-0 overflow-hidden">
            {/* 3D NFT Viewer */}
            <div className="aspect-square bg-black/50 relative group">
              <NFTCanvas
                glassColor={tier.glassColor}
                glowColor={tier.glowColor}
                tierName={tier.name}
                autoRotate={true}
                loadHDR={true}
              />

              {/* Fullscreen Button */}
              <button
                onClick={() => setFullscreenTier(tier)}
                className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 rounded-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                title="View Fullscreen"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Tier Info */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: tier.glowColor }}>
                  {tier.name}
                </h3>
                <span className="text-sm text-text-muted">{tier.rarity}</span>
              </div>

              {/* Drop Rate */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Drop Rate</span>
                  <span className="font-mono font-semibold">
                    {((tier.weight / TIERS.reduce((sum, t) => sum + t.weight, 0)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
