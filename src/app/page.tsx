'use client';

import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { Sparkles, Mail, Wallet, ExternalLink } from 'lucide-react';
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
            10 Years of Parity
          </h1>

          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Celebrate a decade of innovation with a generative art NFT on Polkadot.
          </p>

          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Link href="/mint">
              <Button variant="primary" size="lg">
                Mint Your NFT
              </Button>
            </Link>
            <Link href="/tiers">
              <Button variant="secondary" size="lg">
                View Tiers
              </Button>
            </Link>
          </div>
        </div>

        {/* 3-Step Explanation */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gradient-pink-purple">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1: Confirm Email */}
            <Card glass className="text-center p-8 hover:scale-105 transition-transform">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-parity-pink to-parity-purple flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">1. Confirm Your Email</h3>
              <p className="text-text-muted">
                Enter your whitelisted email and verify it with the 6-digit code sent to your inbox.
              </p>
            </Card>

            {/* Step 2: Connect Wallet */}
            <Card glass className="text-center p-8 hover:scale-105 transition-transform">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-parity-purple to-parity-indigo flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">2. Connect Your Wallet</h3>
              <p className="text-text-muted">
                Connect your wallet and select the account you want to mint to.
              </p>
            </Card>

            {/* Step 3: Mint & View */}
            <Card glass className="text-center p-8 hover:scale-105 transition-transform">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-parity-indigo to-parity-cyan flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">3. Mint & View NFT</h3>
              <p className="text-text-muted">
                Mint your unique NFT and view it on Subscan, Nova Wallet, or Kodadot.
              </p>
            </Card>
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
