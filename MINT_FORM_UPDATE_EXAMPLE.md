# How to Update MintForm.tsx for Wallet Connection

Here's a step-by-step guide to integrate wallet connection into your mint form.

## Changes to Make

### 1. Add wallet context import

At the top of `/src/components/MintForm.tsx`, add:

```tsx
import { useWallet } from '@/contexts/WalletContext';
import WalletConnect from './WalletConnect';
```

### 2. Use the wallet hook

Inside your `MintForm` component:

```tsx
export default function MintForm() {
  const { isConnected, selectedAccount } = useWallet();

  // Your existing code...
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<MintFormData>({
    resolver: zodResolver(mintFormSchema),
  });
```

### 3. Auto-fill address when wallet connects

Add this useEffect after your form setup:

```tsx
import { useEffect } from 'react';

export default function MintForm() {
  const { isConnected, selectedAccount } = useWallet();
  const { setValue } = useForm<MintFormData>({...});

  // Auto-fill wallet address when wallet is connected
  useEffect(() => {
    if (isConnected && selectedAccount) {
      setValue('walletAddress', selectedAccount.address, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [isConnected, selectedAccount, setValue]);

  // Rest of your component...
}
```

### 4. Update the wallet address input field

Find your wallet address input and update it:

```tsx
{/* Replace your current wallet address field with this: */}
<div className="space-y-2">
  <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-300">
    Wallet Address *
  </label>

  {!isConnected && (
    <div className="mb-3 p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
      <p className="text-sm text-gray-300 mb-3">
        Connect your wallet to auto-fill your address:
      </p>
      <WalletConnect />
      <p className="text-xs text-gray-500 mt-2">
        or paste your Polkadot address below
      </p>
    </div>
  )}

  <Input
    id="walletAddress"
    {...register('walletAddress')}
    placeholder={isConnected ? "Using connected wallet address" : "Enter your Polkadot address"}
    disabled={isConnected}
    className={`font-mono ${isConnected ? 'bg-gray-800/50' : ''}`}
  />

  {isConnected && selectedAccount && (
    <div className="flex items-center gap-2 text-sm text-green-400">
      <Check className="w-4 h-4" />
      <span>
        Connected: {selectedAccount.name || 'Unnamed Account'}
      </span>
    </div>
  )}

  {errors.walletAddress && (
    <p className="text-sm text-red-400">{errors.walletAddress.message}</p>
  )}
</div>
```

## Complete Example

Here's how the relevant section of your MintForm should look:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import WalletConnect from './WalletConnect';
import { mintFormSchema, type MintFormData } from '@/lib/validation';

export default function MintForm() {
  const { isConnected, selectedAccount } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<MintFormData>({
    resolver: zodResolver(mintFormSchema),
  });

  // Auto-fill wallet address when wallet is connected
  useEffect(() => {
    if (isConnected && selectedAccount) {
      setValue('walletAddress', selectedAccount.address, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [isConnected, selectedAccount, setValue]);

  const onSubmit = async (data: MintFormData) => {
    setIsSubmitting(true);
    try {
      // Your existing mint logic...
    } catch (error) {
      // Your error handling...
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Email field - your existing code */}

      {/* Wallet Address field - NEW */}
      <div className="space-y-2">
        <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-300">
          Wallet Address *
        </label>

        {!isConnected && (
          <div className="mb-3 p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
            <p className="text-sm text-gray-300 mb-3">
              Connect your wallet to auto-fill your address:
            </p>
            <WalletConnect />
            <p className="text-xs text-gray-500 mt-2">
              or paste your Polkadot address below
            </p>
          </div>
        )}

        <input
          {...register('walletAddress')}
          placeholder={isConnected ? "Using connected wallet address" : "Enter your Polkadot address"}
          disabled={isConnected}
          className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm ${
            isConnected ? 'bg-gray-800/50 cursor-not-allowed' : ''
          }`}
        />

        {isConnected && selectedAccount && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Check className="w-4 h-4" />
            <span>
              Connected: {selectedAccount.name || 'Unnamed Account'}
            </span>
          </div>
        )}

        {errors.walletAddress && (
          <p className="text-sm text-red-400">{errors.walletAddress.message}</p>
        )}
      </div>

      {/* Submit button - your existing code */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
      >
        {isSubmitting ? 'Minting...' : 'Mint NFT'}
      </button>
    </form>
  );
}
```

## Testing Checklist

- [ ] Wrap app in `WalletProvider` in layout.tsx
- [ ] Import and use `useWallet` hook in MintForm
- [ ] Import `WalletConnect` component
- [ ] Add useEffect to auto-fill address
- [ ] Update wallet address input field
- [ ] Test without wallet extension (should allow manual entry)
- [ ] Test with Polkadot.js extension installed
- [ ] Test connecting wallet
- [ ] Test switching accounts
- [ ] Test disconnecting
- [ ] Test form submission with connected wallet
- [ ] Test form validation still works

## User Experience Improvements

With this integration:

✅ **Better UX**: One-click address filling instead of copy/paste
✅ **Less Errors**: No typos in manually entered addresses
✅ **Account Display**: Shows friendly account names
✅ **Multiple Accounts**: Easy switching between accounts
✅ **Fallback**: Still allows manual entry if no wallet
✅ **Visual Feedback**: Clear connection status

## Future Enhancement: Transaction Signing

Currently, minting happens server-side with a proxy account. In the future, you could have users sign their own transactions:

```tsx
const { isConnected, selectedAccount } = useWallet();

async function mintWithUserSignature() {
  if (!isConnected || !selectedAccount) {
    throw new Error('Wallet not connected');
  }

  // Get the signer from the account
  const signer = selectedAccount.polkadotSigner;

  // Create and sign transaction
  const tx = api.tx.Nfts.mint({...});
  await tx.signAndSubmit(signer);
}
```

This would require updating your backend to accept user-signed transactions instead of using the proxy.
