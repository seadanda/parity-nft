'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import WalletConnect from './WalletConnect';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-parity-pink focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      <header className="fixed top-0 left-0 right-0 z-50 glass" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity"
              aria-label="10 Years of Parity Home"
            >
              <Image
                src="/parity-10-years-logo.png"
                alt="10 Years of Parity Anniversary Logo"
                width={120}
                height={40}
                priority
                className="h-8 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center space-x-6" aria-label="Main navigation">
                <Link
                  href="/"
                  className="text-sm text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
                  aria-label="Go to home page"
                >
                  Home
                </Link>
                <Link
                  href="/how-it-works"
                  className="text-sm text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
                  aria-label="Learn how the NFT system works"
                >
                  How It Works
                </Link>
                <Link
                  href="/tiers"
                  className="text-sm text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
                  aria-label="View rarity tiers"
                >
                  Tiers
                </Link>
                <Link
                  href="/gallery"
                  className="text-sm text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
                  aria-label="View all minted NFTs"
                >
                  Gallery
                </Link>
                <Link
                  href="/mint"
                  className="text-sm text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
                  aria-label="Mint your NFT"
                >
                  Mint
                </Link>
              </nav>
              <WalletConnect />
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink rounded"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/10">
            <nav className="px-4 py-4 space-y-3" aria-label="Mobile navigation">
              <Link
                href="/"
                className="block text-sm text-text-muted hover:text-foreground transition-colors px-2 py-2 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/how-it-works"
                className="block text-sm text-text-muted hover:text-foreground transition-colors px-2 py-2 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/tiers"
                className="block text-sm text-text-muted hover:text-foreground transition-colors px-2 py-2 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tiers
              </Link>
              <Link
                href="/gallery"
                className="block text-sm text-text-muted hover:text-foreground transition-colors px-2 py-2 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Gallery
              </Link>
              <Link
                href="/mint"
                className="block text-sm text-text-muted hover:text-foreground transition-colors px-2 py-2 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Mint
              </Link>
              <div className="pt-2">
                <WalletConnect />
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
