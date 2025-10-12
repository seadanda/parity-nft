'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const TierShowcase = dynamic(() => import('@/components/TierShowcase'), {
  ssr: false,
});

export default function TiersPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Static starfield background (matching the home page)
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
        {/* Page Header */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gradient-pink-purple">
            Rarity Tiers
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            12 unique tiers with varying rarity. Each tier features distinct glass and glow colors
            determined by cryptographic randomness from your mint hash.
          </p>
        </div>

        {/* Tier Showcase */}
        <section className="mb-24">
          <TierShowcase />
        </section>
      </div>
    </main>
  );
}
