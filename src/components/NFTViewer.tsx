'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, ExternalLink, Check } from 'lucide-react';
import TierBadge from '@/components/TierBadge';
import NFTCanvas from '@/components/NFTCanvas';
import { Button, Card } from '@/components/ui';
import { getSubscanLink, formatHash, truncateAddress } from '@/lib/utils';

interface NFTMetadata {
  nftId: string;
  collectionId?: string;
  tier: string;
  rarity: string;
  glassColor: string;
  glowColor: string;
  ipfsImageUrl?: string;
  ipfsMetadataUrl?: string;
  animationUrl?: string;
  owner?: string;
  transactionHash?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface NFTViewerProps {
  hash: string;
  metadata: NFTMetadata;
}

export default function NFTViewer({ hash, metadata }: NFTViewerProps) {
  const [copied, setCopied] = useState<'link' | null>(null);
  const [ownerIdentity, setOwnerIdentity] = useState<string>('anon');
  const [loadingIdentity, setLoadingIdentity] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/view/${hash}`;

  // Fetch owner identity on mount - using client-side RPC
  useEffect(() => {
    if (metadata.owner) {
      setLoadingIdentity(true);

      // Import dynamically to avoid server-side issues
      import('@/lib/client-rpc')
        .then(({ getIdentity }) => getIdentity(metadata.owner!))
        .then(identity => {
          setOwnerIdentity(identity.display);
        })
        .catch(err => {
          console.error('Failed to fetch owner identity:', err);
          setOwnerIdentity('anon');
        })
        .finally(() => {
          setLoadingIdentity(false);
        });
    }
  }, [metadata.owner]);

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
    const text = `Check out my 10 Years of Parity NFT - ${metadata.tier} tier!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const text = `Check out my 10 Years of Parity NFT - ${metadata.tier} tier!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 3D Viewer - Takes up 2 columns on desktop */}
      <div className="lg:col-span-2">
        <div className="overflow-hidden aspect-square">
          <NFTCanvas
            glassColor={metadata.glassColor}
            glowColor={metadata.glowColor}
            autoRotate={true}
            loadHDR={true}
          />
        </div>
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
            {/* NFT ID - Clickable to Subscan */}
            {metadata.collectionId && metadata.nftId && (
              <div>
                <div className="text-xs text-text-muted mb-1">NFT</div>
                <a
                  href={getSubscanLink('nft', '', parseInt(metadata.collectionId), parseInt(metadata.nftId))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-parity-pink hover:text-parity-purple transition-colors flex items-center gap-1"
                >
                  #{metadata.collectionId}/{metadata.nftId}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Hash */}
            <div>
              <div className="text-xs text-text-muted mb-1">Hash</div>
              <div className="font-mono text-xs break-all">
                {formatHash(hash)}
              </div>
            </div>

            {/* Owner - Show identity name and wallet address */}
            {metadata.owner && (
              <div>
                <div className="text-xs text-text-muted mb-1">Owner</div>
                {/* Display identity name prominently */}
                <div className="text-sm font-medium mb-1">
                  {loadingIdentity ? '...' : ownerIdentity}
                </div>
                {/* Show wallet address as secondary info */}
                <a
                  href={getSubscanLink('account', metadata.owner)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-text-muted hover:text-parity-purple transition-colors flex items-center gap-1"
                >
                  {truncateAddress(metadata.owner)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Transaction Hash - Clickable to Subscan */}
            {metadata.transactionHash && (
              <div>
                <div className="text-xs text-text-muted mb-1">Transaction</div>
                <a
                  href={getSubscanLink('extrinsic', metadata.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-parity-pink hover:text-parity-purple transition-colors flex items-center gap-1"
                >
                  {formatHash(metadata.transactionHash)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* On-Chain & IPFS Links */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-xs text-text-muted mb-2">On-Chain Metadata</div>

              {metadata.animationUrl && (
                <a
                  href={metadata.animationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm hover:text-parity-pink transition-colors"
                >
                  <span>Animation URL</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

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
                  <span>IPFS Metadata JSON</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Attributes */}
            {metadata.attributes && metadata.attributes.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <div className="text-xs text-text-muted mb-2">Attributes</div>
                <div className="space-y-2">
                  {metadata.attributes.map((attr, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-text-muted">{attr.trait_type}:</span>
                      <span className="font-mono">{attr.value}</span>
                    </div>
                  ))}
                </div>
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
