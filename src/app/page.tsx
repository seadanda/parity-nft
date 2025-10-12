'use client';

import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import TierBadge from '@/components/TierBadge';
import { TIERS } from '@/lib/tiers';
import { Sparkles, Palette, Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const HeroViewer = dynamic(() => import('@/components/HeroViewer'), {
  ssr: false,
});

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Static starfield background (matching the 3D viewer)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create static stars (sparse, like the viewer)
    const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
    const numStars = 100; // Fewer stars for subtlety

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3, // Subtle opacity
      });
    }

    const render = () => {
      // Dark background
      ctx.fillStyle = 'rgba(10, 10, 15, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw static stars
      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    // Re-render on resize
    const handleResize = () => {
      resizeCanvas();
      // Regenerate stars for new dimensions
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
        });
      }
      render();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <main className="min-h-screen pt-24 px-4 relative">
      {/* Static Starfield Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-24">
          {/* 3D Hero Logo - Transparent Canvas */}
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-2xl h-[400px]">
              <HeroViewer />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-gradient-pink-purple">
            Parity 10 Years
          </h1>

          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Celebrate a decade of innovation with unique 3D glass logo NFTs on Polkadot.
            Each NFT is a one-of-a-kind soulbound token.
          </p>

          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Link href="/mint">
              <Button variant="primary" size="lg">
                Mint Your NFT
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Tiers
            </Button>
          </div>
        </div>

        {/* 3-Step Explanation */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gradient-pink-purple">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1: Mint */}
            <Card glass className="text-center p-8 hover:scale-105 transition-transform">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-parity-pink to-parity-purple flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">1. Mint Your NFT</h3>
              <p className="text-text-muted">
                Provide your email and Polkadot wallet address to mint a unique commemorative NFT on Asset Hub.
              </p>
            </Card>

            {/* Step 2: Discover */}
            <Card glass className="text-center p-8 hover:scale-105 transition-transform">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-parity-purple to-parity-indigo flex items-center justify-center">
                  <Palette className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">2. Discover Your Tier</h3>
              <p className="text-text-muted">
                Each NFT is assigned a rarity tier from Common to Legendary, with unique glass and glow colors.
              </p>
            </Card>

            {/* Step 3: Keep Forever */}
            <Card glass className="text-center p-8 hover:scale-105 transition-transform">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-parity-indigo to-parity-purple flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">3. Keep Forever</h3>
              <p className="text-text-muted">
                Your NFT is soulbound (non-transferable) and stored permanently on IPFS and Polkadot Asset Hub.
              </p>
            </Card>
          </div>
        </section>

        {/* Tier Showcase */}
        <section id="tiers" className="mb-24 scroll-mt-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gradient-pink-purple">
            Rarity Tiers
          </h2>
          <p className="text-center text-text-muted mb-12 max-w-2xl mx-auto">
            12 unique tiers with varying rarity. Each tier features distinct glass and glow colors
            determined by cryptographic randomness from your mint hash.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {TIERS.map((tier) => (
              <Card
                key={tier.name}
                glass
                className="p-6 hover:scale-105 transition-transform cursor-pointer"
              >
                <TierBadge
                  tier={tier.name}
                  rarity={tier.rarity}
                  glassColor={tier.glassColor}
                  glowColor={tier.glowColor}
                  size="md"
                />
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Drop Rate</span>
                    <span className="font-mono">
                      {((tier.weight / TIERS.reduce((sum, t) => sum + t.weight, 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center pb-24">
          <Card glass className="p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gradient-pink-purple">
              Ready to Mint?
            </h2>
            <p className="text-xl text-text-muted mb-8">
              Join the celebration and claim your unique piece of Parity history.
            </p>
            <Link href="/mint">
              <Button variant="primary" size="lg">
                Mint Your NFT Now
              </Button>
            </Link>
          </Card>
        </section>
      </div>
    </main>
  );
}
