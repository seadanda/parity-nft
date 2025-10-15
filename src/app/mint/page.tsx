'use client';

import MintForm from '@/components/MintForm';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';

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
            </div>

            {/* Minting Not Live Warning */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <div className="flex items-center gap-3 px-3 py-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-200/90">
                    <span className="font-semibold">Minting Not Yet Live:</span> The minting period has not started yet.
                  </p>
                </div>
              </div>
            </Card>

            <MintForm />
          </div>
        </div>
      </div>
    </main>
  );
}
