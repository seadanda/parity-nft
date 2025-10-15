'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Copy, Filter, X } from 'lucide-react';
import { calculateTierFromHash } from '@/lib/tier-calculator';
import { useWallet } from '@/contexts/WalletContext';
import { ss58Encode, ss58Decode } from '@polkadot-labs/hdkd-helpers';

const NFTCanvas = dynamic(() => import('@/components/NFTCanvas'), {
  ssr: false,
});

interface NFTData {
  id: number;
  wallet_address: string;
  collection_id: number;
  nft_id: number;
  hash: string;
  tier: string;
  rarity: string;
  transaction_hash: string | null;
  minted_at: string;
  identity?: string; // Display name from People chain
}

export default function GalleryPage() {
  const { selectedAccount } = useWallet();
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAddress, setFilterAddress] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function fetchNFTs() {
      try {
        const response = await fetch('/api/mints/recent');
        const data = await response.json();

        if (data.success) {
          // The API now includes identity data for each mint
          setNfts(data.mints);
        } else {
          setError(data.error || 'Failed to load NFTs');
        }
      } catch (err) {
        setError('Failed to fetch NFTs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchNFTs();
  }, []);

  // Static starfield background
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

    // Create static stars
    const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
    const numStars = 100;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    const render = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    const handleResize = () => {
      resizeCanvas();
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

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Normalize address to Polkadot format for comparison
  const normalizeAddress = (address: string): string => {
    try {
      const [publicKey] = ss58Decode(address);
      return ss58Encode(publicKey, 0);
    } catch {
      return address;
    }
  };

  // Filter NFTs by address (comparing in Polkadot format)
  const filteredNfts = filterAddress
    ? nfts.filter(nft => normalizeAddress(nft.wallet_address) === normalizeAddress(filterAddress))
    : nfts;

  // Filter by connected wallet
  const handleFilterMyNFTs = () => {
    if (selectedAccount) {
      setFilterAddress(selectedAccount.address);
    }
  };

  // Clear filter
  const handleClearFilter = () => {
    setFilterAddress(null);
  };

  return (
    <div className="relative min-h-screen">
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full -z-10"
        style={{ background: '#0a0a0f' }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-transparent bg-clip-text">
                Minted NFTs
              </span>
            </h1>
            <p className="text-gray-400 text-center text-lg max-w-2xl mx-auto mb-6">
              Gallery of all minted 10 Years of Parity NFTs
            </p>

            {/* Filter Controls */}
            <div className="flex justify-center gap-3 mt-6">
              {selectedAccount && !filterAddress && (
                <button
                  onClick={handleFilterMyNFTs}
                  className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Show My NFTs
                </button>
              )}

              {filterAddress && (
                <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 border border-pink-500/50 text-pink-400 rounded-lg">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">
                    Filtering: {selectedAccount?.address === filterAddress ? 'My NFTs' : truncateAddress(filterAddress)}
                  </span>
                  <button
                    onClick={handleClearFilter}
                    className="ml-2 hover:bg-pink-500/20 p-1 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="px-6 pb-24">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center text-gray-400 py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mb-4"></div>
                <p>Loading NFTs...</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 py-12">
                <p>{error}</p>
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p>No NFTs have been minted yet. Will you be the first?</p>
              </div>
            ) : filteredNfts.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p>No NFTs found for this address.</p>
                <button
                  onClick={handleClearFilter}
                  className="mt-4 text-pink-400 hover:text-pink-300 underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNfts.map((nft) => {
                  return (
                    <div
                      key={nft.id}
                      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden hover:border-pink-500/50 transition-all duration-300"
                    >
                      {/* NFT Viewer */}
                      <div className="aspect-square">
                        <NFTCanvas
                          hash={nft.hash}
                          autoRotate={true}
                          loadHDR={true}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">NFT #{nft.nft_id}</p>
                            <h3 className="text-lg font-semibold text-white">{nft.tier}</h3>
                            <p className="text-sm text-gray-400">{nft.rarity}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-800">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500">Owner</p>
                            <button
                              onClick={() => navigator.clipboard.writeText(nft.wallet_address)}
                              className="text-gray-500 hover:text-pink-400 transition-colors"
                              title="Copy address"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Display identity name prominently */}
                          <div className="text-sm font-medium text-white">
                            {nft.identity || 'anon'}
                          </div>
                          {/* Show wallet address as secondary info */}
                          <a
                            href={`https://assethub-polkadot.subscan.io/account/${nft.wallet_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-gray-500 hover:text-pink-400 transition-colors block"
                            title={nft.wallet_address}
                          >
                            {truncateAddress(nft.wallet_address)}
                          </a>
                        </div>

                        <div className="flex gap-2">
                          <a
                            href={`/view/${nft.hash}`}
                            className="flex-1 text-center px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded text-sm font-medium transition-colors"
                          >
                            View Fullsize
                          </a>
                          <a
                            href={`https://assethub-polkadot.subscan.io/nft_item/${nft.collection_id}-${nft.nft_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-sm font-medium transition-colors"
                          >
                            Subscan
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats */}
            {!loading && !error && nfts.length > 0 && (
              <div className="mt-12 text-center">
                <p className="text-gray-400">
                  {filterAddress ? (
                    <>
                      Showing <span className="text-white font-semibold">{filteredNfts.length}</span> of{' '}
                      <span className="text-white font-semibold">{nfts.length}</span> total
                    </>
                  ) : (
                    <>
                      Total Minted: <span className="text-white font-semibold">{nfts.length}</span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
