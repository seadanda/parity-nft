'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button, Input, Modal, Card } from '@/components/ui';
import { mintFormSchema, type MintFormData } from '@/lib/validation';
import { mintNFT, type MintResponse } from '@/lib/api';
import TierBadge from './TierBadge';
import EmailVerification from './EmailVerification';

export default function MintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<MintResponse | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<MintFormData>({
    resolver: zodResolver(mintFormSchema),
  });

  const handleEmailVerified = (email: string, token: string) => {
    setVerifiedEmail(email);
    setSessionToken(token);
    setIsEmailVerified(true);
    setValue('email', email);
  };

  const onSubmit = async (data: MintFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await mintNFT(data);

      if (response.success && response.hash) {
        setSuccessData(response);

        // Record mint in backend
        await fetch('/api/mint/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            walletAddress: data.walletAddress,
            collectionId: response.collectionId,
            nftId: response.nftId,
            hash: response.hash,
            tier: response.tier,
            rarity: response.rarity,
            transactionHash: response.transactionHash
          })
        });
      } else {
        setError(response.error || 'Failed to mint NFT');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccess = () => {
    if (successData?.hash) {
      router.push(`/view/${successData.hash}`);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setError(null);
    reset();
  };

  // Show email verification step first
  if (!isEmailVerified) {
    return <EmailVerification onVerified={handleEmailVerified} />;
  }

  return (
    <>
      <Card glass>
        <div className="space-y-6">
          {/* Verified Email Badge */}
          <div className="p-4 rounded-xl bg-parity-pink/10 border border-parity-pink/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Verified Email</p>
                <p className="font-medium">{verifiedEmail}</p>
              </div>
              <div className="text-2xl">✓</div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Wallet Address Input */}
            <Input
              label="Polkadot Wallet Address"
              type="text"
              placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
              icon={<Wallet className="w-5 h-5" />}
              error={errors.walletAddress?.message}
              {...register('walletAddress')}
            />

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Minting...' : 'Mint NFT'}
            </Button>
          </form>
        </div>
      </Card>

      {/* Success Modal */}
      <Modal
        isOpen={!!successData}
        onClose={handleReset}
        title="🎊 NFT Minted Successfully!"
      >
        <div className="space-y-6">
          <p className="text-text-muted">
            Congratulations! Your Parity 10 Years NFT has been successfully minted.
          </p>

          {successData && (
            <div className="space-y-4">
              {/* Tier Badge */}
              {successData.tier && (
                <div className="flex justify-center">
                  <TierBadge
                    tier={successData.tier}
                    rarity={successData.rarity || ''}
                    glassColor={successData.glassColor || '#ffffff'}
                    glowColor={successData.glowColor || '#ffffff'}
                    size="lg"
                  />
                </div>
              )}

              {/* Details */}
              <div className="glass rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">NFT ID:</span>
                  <span className="font-mono">#{successData.nftId}</span>
                </div>
                {successData.transactionHash && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Transaction:</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {successData.transactionHash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleSuccess}
              className="flex-1"
            >
              View NFT
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
