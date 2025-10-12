'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button, Input, Modal, Card } from '@/components/ui';
import { mintFormSchema, type MintFormData } from '@/lib/validation';
import { mintNFT, type MintResponse } from '@/lib/api';
import TierBadge from './TierBadge';

export default function MintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<MintResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MintFormData>({
    resolver: zodResolver(mintFormSchema),
  });

  const onSubmit = async (data: MintFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await mintNFT(data);

      if (response.success && response.hash) {
        setSuccessData(response);
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

  return (
    <>
      <Card glass>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Input */}
          <Input
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            icon={<Mail className="w-5 h-5" />}
            error={errors.email?.message}
            {...register('email')}
          />

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

          <p className="text-xs text-text-muted text-center">
            By minting, you agree that this NFT is soulbound and cannot be transferred.
          </p>
        </form>
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
              Mint Another
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
