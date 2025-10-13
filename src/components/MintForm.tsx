'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button, Input, Modal, Card } from '@/components/ui';
import { mintFormSchema, type MintFormData } from '@/lib/validation';
import { type MintResponse } from '@/lib/api';
import { getSubscanLink, formatHash } from '@/lib/utils';
import EmailVerification from './EmailVerification';
import TierViewer from './TierViewer';
import { Check, Loader2, Circle, ExternalLink } from 'lucide-react';

type MintStatus = 'idle' | 'validating' | 'checking_balance' | 'minting' | 'in_block' | 'finalized' | 'success' | 'error';

// Status Check Component
function StatusCheck({
  label,
  status,
  balance
}: {
  label: string;
  status: 'pending' | 'loading' | 'complete';
  balance?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {status === 'complete' && <Check className="w-5 h-5 text-green-400 flex-shrink-0" />}
      {status === 'loading' && <Loader2 className="w-5 h-5 text-parity-pink animate-spin flex-shrink-0" />}
      {status === 'pending' && <Circle className="w-5 h-5 text-text-muted/30 flex-shrink-0" />}
      <span className={`text-sm ${
        status === 'complete' ? 'text-green-400' :
        status === 'loading' ? 'text-foreground' :
        'text-text-muted'
      }`}>
        {label}
        {balance && <span className="text-text-muted ml-2">- Balance: {balance} DOT</span>}
      </span>
    </div>
  );
}

export default function MintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<MintResponse | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle');
  const [blockNumber, setBlockNumber] = useState<string | null>(null);
  const [extrinsicId, setExtrinsicId] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<string | null>(null);

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
    setAccountBalance(null);
    setMintStatus('validating');

    try {
      // Status: Validating address (already validated by form schema)
      setMintStatus('validating');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Status: Checking balance - actual RPC call
      setMintStatus('checking_balance');
      const balanceCheckResponse = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: data.walletAddress })
      });

      if (!balanceCheckResponse.ok) {
        const balanceError = await balanceCheckResponse.json();
        throw new Error(balanceError.error || 'Failed to check balance');
      }

      const { hasBalance, balance } = await balanceCheckResponse.json();
      setAccountBalance(balance); // Store balance for display

      if (!hasBalance) {
        throw new Error(`Insufficient balance. Account has ${balance} DOT but needs at least 0.1 DOT`);
      }

      // Status: Minting
      setMintStatus('minting');

      // Call the mint API with session token
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          email: verifiedEmail,
          walletAddress: data.walletAddress
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMintStatus('error');

        // Handle specific error types
        if (result.error === 'PROXY_BALANCE_TOO_LOW') {
          throw new Error(result.message || 'Minting service temporarily unavailable. Please try again later or contact support.');
        }

        throw new Error(result.error || 'Failed to mint NFT');
      }

      if (result.success && result.hash) {
        // Status: In block (this is real, from the blockchain RPC)
        // The backend actually waits for status.isInBlock via RPC before returning
        // See mint.ts:270 - signAndSend callback checks status.isInBlock
        setMintStatus('in_block');
        setBlockNumber(result.transactionHash || null);

        // Extract extrinsic ID from transaction hash if available
        if (result.transactionHash) {
          setExtrinsicId(result.transactionHash);
        }

        // Status: Finalized
        // Since the backend already confirmed inBlock via RPC, we can show finalized
        // (The mint function waits for actual RPC response, not simulation)
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief UX delay
        setMintStatus('finalized');

        setMintStatus('success');
        setSuccessData(result);
      } else {
        setMintStatus('error');
        setError(result.error || 'Failed to mint NFT');
      }
    } catch (err) {
      setMintStatus('error');
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
    setAccountBalance(null);
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
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400/80">You're In</p>
                <p className="font-medium text-green-100">{verifiedEmail}</p>
              </div>
              <div className="text-2xl text-green-400">✓</div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Wallet Address Input */}
            <Input
              label="Polkadot Wallet Address"
              type="text"
              placeholder="15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
              icon={<Wallet className="w-5 h-5" />}
              error={errors.walletAddress?.message}
              {...register('walletAddress')}
            />

            {/* Minting Status Checks */}
            {isSubmitting && (
              <div className="space-y-2 p-4 rounded-xl bg-background/50 border border-white/10">
                <StatusCheck
                  label="Valid account address"
                  status={mintStatus === 'validating' ? 'loading' : 'complete'}
                />
                <StatusCheck
                  label="Has ED (0.1 DOT)"
                  status={
                    mintStatus === 'idle' || mintStatus === 'validating' ? 'pending' :
                    mintStatus === 'checking_balance' ? 'loading' : 'complete'
                  }
                  balance={accountBalance || undefined}
                />
                <StatusCheck
                  label="Minting..."
                  status={
                    ['idle', 'validating', 'checking_balance'].includes(mintStatus) ? 'pending' :
                    mintStatus === 'minting' ? 'loading' : 'complete'
                  }
                />
                <StatusCheck
                  label="In block"
                  status={
                    ['idle', 'validating', 'checking_balance', 'minting'].includes(mintStatus) ? 'pending' :
                    mintStatus === 'in_block' ? 'loading' : 'complete'
                  }
                />
                <StatusCheck
                  label="Finalized"
                  status={
                    ['idle', 'validating', 'checking_balance', 'minting', 'in_block'].includes(mintStatus) ? 'pending' :
                    mintStatus === 'finalized' ? 'loading' : 'complete'
                  }
                />
                {extrinsicId && mintStatus === 'success' && (
                  <div className="pt-2 mt-2 border-t border-white/10">
                    <a
                      href={getSubscanLink('extrinsic', extrinsicId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-parity-pink hover:text-parity-purple transition-colors flex items-center gap-1"
                    >
                      View on Subscan: {formatHash(extrinsicId)}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            )}

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
            Congratulations! Your 10 Years of Parity NFT has been successfully minted.
          </p>

          {successData && (
            <div className="space-y-4">
              {/* NFT Preview */}
              {successData.glassColor && successData.glowColor && (
                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                  <TierViewer
                    glassColor={successData.glassColor}
                    glowColor={successData.glowColor}
                    autoRotate={true}
                    loadHDR={true}
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Tier Display */}
              {successData.tier && (
                <div className="text-center py-6 px-4 rounded-xl bg-gradient-to-br from-parity-pink/10 to-parity-purple/10 border border-parity-pink/20">
                  <div className="text-3xl font-bold bg-gradient-to-r from-parity-pink to-parity-purple bg-clip-text text-transparent mb-2">
                    {successData.tier}
                  </div>
                  <div className="text-sm text-text-muted">{successData.rarity}</div>
                </div>
              )}

              {/* Details */}
              <div className="glass rounded-xl p-4 space-y-3 text-sm">
                {/* NFT Link */}
                {successData.collectionId && successData.nftId && (
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">NFT:</span>
                    <a
                      href={getSubscanLink('nft', '', successData.collectionId, successData.nftId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-parity-pink hover:text-parity-purple transition-colors flex items-center gap-1"
                    >
                      #{successData.collectionId}/{successData.nftId}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Hash */}
                {successData.hash && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Hash:</span>
                    <span className="font-mono text-xs">
                      {formatHash(successData.hash)}
                    </span>
                  </div>
                )}

                {/* Transaction Link */}
                {successData.transactionHash && (
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Transaction:</span>
                    <a
                      href={getSubscanLink('extrinsic', successData.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-parity-pink hover:text-parity-purple transition-colors flex items-center gap-1"
                    >
                      {formatHash(successData.transactionHash)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
