'use client';

import MintForm from '@/components/MintForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MintPage() {
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

        <div className="max-w-2xl mx-auto">
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
        </div>
      </div>
    </main>
  );
}
