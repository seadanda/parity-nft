'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface InjectedAccount {
  address: string;
  name?: string;
  source: string;
  type?: string;
}

interface WalletContextType {
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  // Extension and accounts
  availableExtensions: string[];
  selectedExtension: string | null;
  accounts: InjectedAccount[];
  selectedAccount: InjectedAccount | null;

  // Actions
  connectWallet: (extensionName?: string) => Promise<void>;
  disconnectWallet: () => void;
  selectAccount: (address: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableExtensions, setAvailableExtensions] = useState<string[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccount | null>(null);

  // Check for available wallet extensions on mount
  useEffect(() => {
    async function checkExtensions() {
      try {
        const { getInjectedExtensions } = await import('polkadot-api/pjs-signer');
        const extensions = getInjectedExtensions();
        setAvailableExtensions(extensions);

        // Auto-select if only one extension is available
        if (extensions.length === 1) {
          setSelectedExtension(extensions[0]);
        }
      } catch (err) {
        console.error('[Wallet] Error checking extensions:', err);
      }
    }

    checkExtensions();
  }, []);

  const connectWallet = useCallback(async (extensionName?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const { connectInjectedExtension } = await import('polkadot-api/pjs-signer');

      // Use provided extension name or the selected one
      const targetExtension = extensionName || selectedExtension || availableExtensions[0];

      if (!targetExtension) {
        throw new Error('No wallet available. Please install Talisman if you\'re on desktop, or nova on mobile (then open this page in nova).');
      }

      console.log('[Wallet] Connecting to extension:', targetExtension);

      // Connect to the extension
      const extension = await connectInjectedExtension(targetExtension);

      // Get accounts from the extension
      const injectedAccounts = extension.getAccounts();

      if (injectedAccounts.length === 0) {
        throw new Error('No accounts found in wallet. Please create an account first.');
      }

      console.log('[Wallet] Found accounts:', injectedAccounts.length);

      // Convert to our account format
      const formattedAccounts: InjectedAccount[] = injectedAccounts.map((acc) => ({
        address: acc.address,
        name: acc.name,
        source: targetExtension,
        type: acc.type,
      }));

      setAccounts(formattedAccounts);
      // Don't auto-select account - let user choose
      setSelectedAccount(null);
      setSelectedExtension(targetExtension);
      setIsConnected(true);

      console.log('[Wallet] Connected successfully, awaiting account selection');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      console.error('[Wallet] Connection error:', err);
      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [selectedExtension, availableExtensions]);

  const disconnectWallet = useCallback(() => {
    setAccounts([]);
    setSelectedAccount(null);
    setSelectedExtension(null);
    setIsConnected(false);
    setError(null);
    console.log('[Wallet] Disconnected');
  }, []);

  const selectAccount = useCallback((address: string) => {
    const account = accounts.find((acc) => acc.address === address);
    if (account) {
      setSelectedAccount(account);
      console.log('[Wallet] Selected account:', address);
    }
  }, [accounts]);

  const value: WalletContextType = {
    isConnecting,
    isConnected,
    error,
    availableExtensions,
    selectedExtension,
    accounts,
    selectedAccount,
    connectWallet,
    disconnectWallet,
    selectAccount,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
