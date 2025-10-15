# Wallet Integration Guide

This guide explains how to integrate Polkadot wallet connection into your NFT minting application using PAPI (Polkadot-API).

## Overview

The wallet integration allows users to connect their browser extension wallets (Polkadot.js, Talisman, SubWallet) instead of manually copying and pasting their addresses.

## Files Created

### 1. `/src/contexts/WalletContext.tsx`
React Context that manages wallet connection state across your app.

**Features:**
- Detects available wallet extensions
- Connects to selected extension
- Retrieves and manages accounts
- Provides account selection
- Disconnect functionality

**API:**
```typescript
const {
  isConnecting,        // boolean - connection in progress
  isConnected,         // boolean - wallet connected
  error,               // string | null - connection error
  availableExtensions, // string[] - detected wallets
  selectedExtension,   // string | null - connected wallet
  accounts,            // InjectedAccount[] - all accounts
  selectedAccount,     // InjectedAccount | null - current account
  connectWallet,       // (extensionName?: string) => Promise<void>
  disconnectWallet,    // () => void
  selectAccount,       // (address: string) => void
} = useWallet();
```

### 2. `/src/components/WalletConnect.tsx`
UI component for wallet connection button.

**Features:**
- Connect wallet button
- Account display with shortened address
- Account switcher dropdown
- Disconnect option
- Visual connection status indicator

## Integration Steps

### Step 1: Wrap your app with WalletProvider

Update `/src/app/layout.tsx`:

```tsx
import { WalletProvider } from '@/contexts/WalletContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
```

### Step 2: Add WalletConnect to your navigation

Update `/src/components/Navbar.tsx` (or wherever you want the button):

```tsx
import WalletConnect from '@/components/WalletConnect';

export default function Navbar() {
  return (
    <nav>
      {/* Your existing nav items */}
      <WalletConnect />
    </nav>
  );
}
```

### Step 3: Update MintForm to use wallet connection

Update `/src/components/MintForm.tsx`:

```tsx
import { useWallet } from '@/contexts/WalletContext';

export default function MintForm() {
  const { isConnected, selectedAccount } = useWallet();

  // Pre-fill wallet address when wallet is connected
  useEffect(() => {
    if (isConnected && selectedAccount) {
      setValue('walletAddress', selectedAccount.address);
    }
  }, [isConnected, selectedAccount, setValue]);

  return (
    <form>
      {/* Email field */}

      {/* Wallet Address field */}
      <div>
        <label>Wallet Address</label>
        <input
          {...register('walletAddress')}
          placeholder={isConnected ? 'Address from connected wallet' : 'Enter your Polkadot address'}
          disabled={isConnected} // Disable manual entry when wallet connected
        />

        {!isConnected && (
          <div className="mt-2">
            <WalletConnect />
            <p className="text-xs text-gray-500 mt-1">
              Or paste your address manually
            </p>
          </div>
        )}

        {isConnected && selectedAccount && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
            <Check className="w-4 h-4" />
            <span>Connected: {selectedAccount.name || 'Unnamed Account'}</span>
          </div>
        )}
      </div>

      {/* Submit button */}
    </form>
  );
}
```

## Supported Wallets

The integration automatically detects and supports:

- **Polkadot{.js} Extension** - https://polkadot.js.org/extension/
- **Talisman** - https://talisman.xyz/
- **SubWallet** - https://subwallet.app/
- Any other wallet that implements the standard Polkadot extension interface

## How It Works

### Extension Detection

```typescript
import { getInjectedExtensions } from 'polkadot-api/pjs-signer';
const extensions = getInjectedExtensions(); // ['polkadot-js', 'talisman', ...]
```

### Connecting to Extension

```typescript
import { connectInjectedExtension } from 'polkadot-api/pjs-signer';
const extension = await connectInjectedExtension('polkadot-js');
```

### Getting Accounts

```typescript
const accounts = extension.getAccounts();
// Returns: InjectedPolkadotAccount[]
// Each account has: address, name, type, polkadotSigner
```

### Using the Signer (for future transaction signing)

```typescript
const account = accounts[0];
const signer = account.polkadotSigner;

// Use signer with PAPI transactions
const tx = api.tx.Balances.transfer_keep_alive({...});
await tx.signAndSubmit(signer);
```

## User Experience Flow

1. **User visits mint page**
   - Sees "Connect Wallet" button
   - Can manually paste address (fallback)

2. **User clicks "Connect Wallet"**
   - System detects available extensions
   - If none found: Shows install prompt
   - If found: Connects to extension

3. **Extension prompts for authorization**
   - User approves in extension popup
   - Extension returns list of accounts

4. **Wallet connected**
   - Button shows connected state with address
   - Wallet address field auto-populated
   - User can switch between accounts if multiple exist

5. **User mints NFT**
   - Form uses connected wallet address
   - (Future: Could also sign transaction with wallet)

## Security Notes

- Wallet extensions never expose private keys
- All signing happens within the extension
- Your app only receives public addresses
- Users must approve each transaction in their wallet

## Troubleshooting

### "No wallet extension available"
- User needs to install a wallet extension
- Provide links to Polkadot.js, Talisman, or SubWallet

### "No accounts found in wallet"
- User needs to create an account in their extension
- Or import an existing account

### Connection fails silently
- User may have denied permission in extension
- Check browser console for errors
- Extension may need to be unlocked

## Future Enhancements

1. **Transaction Signing**
   - Currently minting uses server-side proxy
   - Could allow users to sign with their wallet
   - Would require updating mint API to accept user signatures

2. **Multi-Chain Support**
   - Detect which network user is connected to
   - Switch networks programmatically
   - Support both Polkadot and Asset Hub

3. **Account Metadata**
   - Display identity information from chain
   - Show account balance before minting
   - Display NFTs owned by connected wallet

## Dependencies

```json
{
  "polkadot-api": "^1.20.0"
}
```

The `polkadot-api/pjs-signer` subpath is included in the main package.

## Browser Compatibility

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅ (with compatible extension)
- Mobile: ⚠️ Limited (depends on wallet app)

## References

- [PAPI Signers Documentation](https://papi.how/signers/)
- [Polkadot.js Extension](https://polkadot.js.org/extension/)
- [Wallet Integration Best Practices](https://wiki.polkadot.network/docs/build-integrate-assets)
