'use client';

import MintForm from '@/components/MintForm';
import { TIERS } from '@/lib/tiers';
import TierBadge from '@/components/TierBadge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MintPage() {
  // Show a few example tiers as preview
  const exampleTiers = [TIERS[5], TIERS[7], TIERS[10]]; // Sapphire, Ruby, Obelisk Ultra

  return (
    <main className="min-h-screen pt-24 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-foreground transition-colors mb-8 focus:outline-none focus:ring-2 focus:ring-parity-pink rounded px-2 py-1"
          aria-label="Go back to home page"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Mint Form */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Mint Your <span className="text-gradient-pink-purple">NFT</span>
              </h1>
              <p className="text-base sm:text-lg text-text-muted">
                Enter your details to receive a unique Parity 10 Years NFT.
                Each NFT features a 3D glass Parity logo with one of 12 rare tiers.
              </p>
            </div>

            <MintForm />
          </div>

          {/* Right: Tier Preview */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold">What You'll Get</h2>

              <ul className="space-y-3 text-sm sm:text-base text-text-muted" role="list">
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1 flex-shrink-0" aria-hidden="true">✓</span>
                  <span>Unique 3D glass logo NFT</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1 flex-shrink-0" aria-hidden="true">✓</span>
                  <span>One of 12 rarity tiers (Common to Legendary)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1 flex-shrink-0" aria-hidden="true">✓</span>
                  <span>Soulbound (non-transferable) commemorative token</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-parity-pink mt-1 flex-shrink-0" aria-hidden="true">✓</span>
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
