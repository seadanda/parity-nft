'use client';

import MintForm from '@/components/MintForm';
import { TIERS } from '@/lib/tiers';
import TierBadge from '@/components/TierBadge';

export default function MintPage() {
  // Show a few example tiers as preview
  const exampleTiers = [TIERS[5], TIERS[7], TIERS[10]]; // Sapphire, Ruby, Obelisk Ultra

  return (
    <main className="min-h-screen pt-24 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Mint Form */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl sm:text-5xl mb-4">
                Mint Your <span className="text-gradient-pink-purple">NFT</span>
              </h1>
              <p className="text-text-muted">
                Enter your details to receive a unique Parity 10 Years NFT.
                Each NFT features a 3D glass Parity logo with one of 12 rare tiers.
              </p>
            </div>

            <MintForm />
          </div>

          {/* Right: Tier Preview */}
          <div className="space-y-6">
            <div className="glass rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold">What You'll Get</h2>

              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1">✓</span>
                  <span>Unique 3D glass logo NFT</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1">✓</span>
                  <span>One of 12 rarity tiers (Common to Legendary)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1">✓</span>
                  <span>Soulbound (non-transferable) commemorative token</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1">✓</span>
                  <span>4K preview image hosted on IPFS</span>
                </li>
              </ul>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-sm font-medium text-text-muted mb-4">
                  Example Tiers
                </h3>
                <div className="space-y-3">
                  {exampleTiers.map((tier) => (
                    <TierBadge
                      key={tier.name}
                      tier={tier.name}
                      rarity={tier.rarity}
                      glassColor={tier.glassColor}
                      glowColor={tier.glowColor}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
