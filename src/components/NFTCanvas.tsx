'use client';

import { useMemo } from 'react';
import { calculateTierFromHash } from '@/lib/tier-calculator';

interface NFTCanvasProps {
  // Primary method: Pass hash and tier is calculated automatically
  hash?: string;

  // Legacy method: Pass colors directly (backwards compat)
  glassColor?: string;
  glowColor?: string;
  tierName?: string;

  // Common props
  autoRotate?: boolean;
  loadHDR?: boolean; // Whether to load the large HDR file (default: false for performance)
  className?: string;
}

export default function NFTCanvas({
  hash,
  glassColor: glassColorProp,
  glowColor: glowColorProp,
  tierName: tierNameProp,
  autoRotate = true,
  loadHDR = true,
  className = '',
}: NFTCanvasProps) {
  // Calculate tier from hash if provided, otherwise use props
  const tierInfo = hash ? calculateTierFromHash(hash) : null;
  const tierName = tierInfo?.name ?? tierNameProp;

  // Build URL for iframe with tier parameter
  const iframeUrl = useMemo(() => {
    const params = new URLSearchParams();

    // If hash is provided, use it (this is a real mint, viewer will calculate tier and show mint ID)
    // If only tier is provided, use it (this is a preview, no mint ID)
    // Never pass both - hash takes precedence
    if (hash) {
      params.set('hash', hash);
    } else if (tierName) {
      params.set('tier', tierName);
    }

    // Pass autoRotate parameter
    params.set('autoRotate', autoRotate ? 'true' : 'false');

    const queryString = params.toString();
    return `/index.html${queryString ? `?${queryString}` : ''}`;
  }, [tierName, hash, autoRotate]);

  return (
    <div
      className={`w-full h-full ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <iframe
        src={iframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        title={`NFT Viewer - ${tierName || 'Random Tier'}`}
      />
    </div>
  );
}
