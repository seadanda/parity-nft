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

            <MintForm />
          </div>
        </div>
      </div>
    </main>
  );
}
