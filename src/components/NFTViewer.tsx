'use client';

import { useState } from 'react';
import { Share2, Copy, ExternalLink, Check } from 'lucide-react';
import TierBadge from '@/components/TierBadge';
import TierViewer from '@/components/TierViewer';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface NFTMetadata {
  nftId: string;
  tier: string;
  rarity: string;
  glassColor: string;
  glowColor: string;
  ipfsImageUrl?: string;
  ipfsMetadataUrl?: string;
  owner?: string;
  transactionHash?: string;
}

interface NFTViewerProps {
  hash: string;
  metadata: NFTMetadata;
}

export default function NFTViewer({ hash, metadata }: NFTViewerProps) {
  const [copied, setCopied] = useState<'link' | null>(null);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/view/${hash}`;

  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareTwitter = () => {
    const text = `Check out my Parity 10 Years NFT - ${metadata.tier} tier!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const text = `Check out my Parity 10 Years NFT - ${metadata.tier} tier!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 3D Viewer - Takes up 2 columns on desktop */}
      <div className="lg:col-span-2">
        <Card glass className="p-0 overflow-hidden aspect-video">
          <TierViewer
            glassColor={metadata.glassColor}
            glowColor={metadata.glowColor}
            autoRotate={true}
            loadHDR={true}
          />
        </Card>
      </div>

      {/* Metadata Sidebar - 1 column on desktop, full width on mobile */}
      <div className="space-y-6">
        {/* Tier Badge */}
        <Card glass>
          <div className="flex justify-center">
            <TierBadge
              tier={metadata.tier}
              rarity={metadata.rarity}
              glassColor={metadata.glassColor}
              glowColor={metadata.glowColor}
              size="lg"
            />
          </div>
        </Card>

        {/* NFT Details */}
        <Card glass>
          <h3 className="text-lg font-bold mb-4">NFT Details</h3>
          <div className="space-y-3">
            {/* NFT ID */}
            <div>
              <div className="text-xs text-text-muted mb-1">NFT ID</div>
              <div className="font-mono text-sm">#{metadata.nftId}</div>
            </div>

            {/* Owner */}
            {metadata.owner && (
              <div>
                <div className="text-xs text-text-muted mb-1">Owner</div>
                <div className="font-mono text-sm">
                  {truncateAddress(metadata.owner)}
                </div>
              </div>
            )}

            {/* Transaction Hash */}
            {metadata.transactionHash && (
              <div>
                <div className="text-xs text-text-muted mb-1">Transaction</div>
                <div className="font-mono text-xs">
                  {truncateAddress(metadata.transactionHash, 8, 6)}
                </div>
              </div>
            )}

            {/* IPFS Links */}
            {(metadata.ipfsImageUrl || metadata.ipfsMetadataUrl) && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                {metadata.ipfsImageUrl && (
                  <a
                    href={metadata.ipfsImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm hover:text-parity-pink transition-colors"
                  >
                    <span>IPFS Image</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {metadata.ipfsMetadataUrl && (
                  <a
                    href={metadata.ipfsMetadataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm hover:text-parity-pink transition-colors"
                  >
                    <span>IPFS Metadata</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Share Section */}
        <Card glass>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share
          </h3>
          <div className="space-y-3">
            {/* Copy Link Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="w-full"
            >
              {copied === 'link' ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareTwitter}
                className="w-full"
              >
                Twitter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareTelegram}
                className="w-full"
              >
                Telegram
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
