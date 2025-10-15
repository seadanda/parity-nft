# Wallet Connection - Quick Start Guide

## What's Been Created

I've created a complete wallet connection system for your NFT minting app using PAPI (Polkadot-API). Here's what's ready:

### 📁 New Files

1. **`src/contexts/WalletContext.tsx`** - Wallet state management
2. **`src/components/WalletConnect.tsx`** - Connection button UI
3. **`WALLET_INTEGRATION.md`** - Complete integration documentation
4. **`MINT_FORM_UPDATE_EXAMPLE.md`** - Step-by-step mint form update guide
5. **`tests/websocket-connection.test.ts`** - WebSocket connection tests

### 🔧 Modified Files

1. **`next.config.ts`** - Added webpack externalization for native modules
2. **`src/lib/ws-provider-vercel.ts`** - Vercel-compatible WebSocket provider
3. **`src/lib/identity.ts`** - Updated to use Vercel provider
4. **`src/lib/mint.ts`** - Updated to use Vercel provider
5. **`src/lib/validation.ts`** - Updated to use Vercel provider

## 🚀 Quick Start (3 Steps)

### Step 1: Wrap Your App

Edit `/src/app/layout.tsx`:

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

### Step 2: Add to Navigation (Optional)

Edit your navbar to add the wallet button:

```tsx
import WalletConnect from '@/components/WalletConnect';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between">
      {/* Your nav items */}
      <WalletConnect />
    </nav>
  );
}
```

### Step 3: Update Mint Form

See `MINT_FORM_UPDATE_EXAMPLE.md` for detailed instructions.

**Quick version:**

```tsx
import { useWallet } from '@/contexts/WalletContext';
import WalletConnect from './WalletConnect';
import { useEffect } from 'react';

export default function MintForm() {
  const { isConnected, selectedAccount } = useWallet();
  const { setValue } = useForm<MintFormData>({...});

  useEffect(() => {
    if (isConnected && selectedAccount) {
      setValue('walletAddress', selectedAccount.address);
    }
  }, [isConnected, selectedAccount, setValue]);

  return (
    <form>
      {!isConnected && <WalletConnect />}
      {/* Your form fields */}
    </form>
  );
}
```

## ✅ Testing

1. **Install a wallet extension**:
   - Polkadot.js: https://polkadot.js.org/extension/
   - Talisman: https://talisman.xyz/
   - SubWallet: https://subwallet.app/

2. **Run your dev server**:
   ```bash
   npm run dev
   ```

3. **Visit the mint page and click "Connect Wallet"**

4. **Approve in your extension** when prompted

5. **Verify**:
   - Wallet address auto-fills
   - Can switch accounts in dropdown
   - Can disconnect

## 🔍 How It Works

```
User clicks "Connect Wallet"
         ↓
System detects available extensions
         ↓
User approves in extension popup
         ↓
Extension returns list of accounts
         ↓
Selected account address auto-fills form
         ↓
User can switch accounts or disconnect
```

## 🎨 UI Features

- **Connection Button**: Changes to show connected state
- **Address Display**: Shows shortened address (e.g., `15oF4u...6Sp5`)
- **Account Name**: Shows friendly name from wallet
- **Dropdown Menu**: Switch between multiple accounts
- **Status Indicator**: Green dot shows active connection
- **Disconnect Option**: One-click disconnect

## 🛡️ Security

- ✅ No private keys ever exposed
- ✅ All signing happens in extension
- ✅ User must approve each connection
- ✅ Addresses are read-only
- ✅ PAPI official integration (not custom code)

## 📚 Documentation

- **`WALLET_INTEGRATION.md`** - Full technical documentation
- **`MINT_FORM_UPDATE_EXAMPLE.md`** - Code examples for mint form
- **PAPI Docs**: https://papi.how/signers/

## 🐛 Troubleshooting

### No wallet detected?
- Install a wallet
- Refresh the page after installing

### Connection fails?
- Check browser console for errors
- Make sure extension is unlocked
- Try refreshing the page

### Address doesn't auto-fill?
- Make sure you wrapped app in `WalletProvider`
- Check that `useEffect` is set up correctly
- Verify `setValue` is called

### Build errors?
- Run `npm install` to ensure dependencies are installed
- Check that `polkadot-api` is at least v1.20.0

## 🔄 Migration from Manual Entry

Your existing mint form will continue to work! The wallet connection is **additive**:

- Users **with** wallets: One-click connection
- Users **without** wallets: Can still paste address manually

Both paths work seamlessly.

## 🎯 Next Steps

1. ✅ Integrate wallet connection (you are here)
2. 🔄 Test with real wallet extension
3. 🎨 Customize button styling if needed
4. 📱 Add to mobile layout
5. 🚀 Deploy to production

## 💡 Future Enhancements

Once this is working, you could add:

- **Transaction signing**: Let users sign their own mints
- **Balance display**: Show DOT balance before minting
- **Identity display**: Show on-chain identity in dropdown
- **Network switching**: Support multiple chains
- **NFT display**: Show user's existing NFTs

## 📞 Support

If you run into issues:

1. Check the documentation files
2. Look at browser console for errors
3. Verify all steps in Quick Start completed
4. Test with Polkadot.js extension first (most common)

## ✨ What Makes This Great

- 🚀 **Modern**: Uses latest PAPI (not deprecated polkadot.js/api)
- 🎯 **Simple**: Just 3 steps to integrate
- 🔒 **Secure**: Official PAPI wallet integration
- 💪 **Robust**: Error handling and fallbacks
- 🎨 **Beautiful**: Polished UI with animations
- ♿ **Accessible**: Keyboard navigation support
- 📱 **Responsive**: Works on mobile (with mobile wallets)

Enjoy your new wallet integration! 🎉
