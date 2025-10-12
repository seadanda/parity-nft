'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { TIERS } from '@/lib/tiers';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

const TierViewer = dynamic(() => import('@/components/TierViewer'), {
  ssr: false,
});

export default function TierShowcase() {
  const [activeTab, setActiveTab] = useState(0);

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
            <div className="aspect-video bg-black/50 relative">
              <TierViewer
                glassColor={tier.glassColor}
                glowColor={tier.glowColor}
                autoRotate={true}
              />
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
