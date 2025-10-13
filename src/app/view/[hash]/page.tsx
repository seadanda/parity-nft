'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import NFTViewer from '@/components/NFTViewer';
import { getNFTMetadata, NFTMetadata } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ViewNFTPage() {
  const params = useParams();
  const hash = params.hash as string;

  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setError('Invalid NFT hash');
      setLoading(false);
      return;
    }

    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getNFTMetadata(hash);
        setMetadata(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load NFT metadata');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [hash]);

  // Loading State
  if (loading) {
    return (
      <main className="min-h-screen pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-parity-pink mb-4" />
            <p className="text-xl text-text-muted">Loading NFT metadata...</p>
          </Card>
        </div>
      </main>
    );
  }

  // Error State
  if (error || !metadata) {
    return (
      <main className="min-h-screen pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="flex flex-col items-center justify-center min-h-[400px]">
            <AlertCircle className="h-12 w-12 text-error mb-4" />
            <h2 className="text-2xl font-bold mb-2">NFT Not Found</h2>
            <p className="text-text-muted mb-8">
              {error || 'The requested NFT could not be found.'}
            </p>
            <Link href="/mint">
              <Button variant="primary">Mint a New NFT</Button>
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  // Success State
  return (
    <main className="min-h-screen pt-24 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-gradient-pink-purple">
            NFT Details
          </h1>
          <p className="text-text-muted">
            10 Years of Parity Anniversary Collection
          </p>
        </div>

        {/* NFTViewer Component */}
        <NFTViewer
          hash={hash}
          metadata={{
            nftId: metadata.nftId.toString(),
            tier: metadata.tier,
            rarity: metadata.rarity,
            glassColor: metadata.glassColor,
            glowColor: metadata.glowColor,
            ipfsImageUrl: metadata.imageUrl,
            ipfsMetadataUrl: metadata.metadataUrl,
            owner: metadata.owner,
          }}
        />

        {/* Actions */}
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/mint">
            <Button variant="primary" size="lg">
              Mint Another NFT
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>
    </main>
  );
}
