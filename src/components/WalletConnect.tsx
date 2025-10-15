'use client';

import { useWallet, type InjectedAccount } from '@/contexts/WalletContext';
import { useState, useEffect, useRef } from 'react';

interface IdentityData {
  display?: string;
}

export default function WalletConnect() {
  const {
    isConnecting,
    isConnected,
    error,
    availableExtensions,
    selectedAccount,
    accounts,
    connectWallet,
    disconnectWallet,
    selectAccount,
  } = useWallet();

  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showAccountPickerModal, setShowAccountPickerModal] = useState(false);
  const [identities, setIdentities] = useState<Record<string, IdentityData>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click away handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountSelector(false);
      }
    }

    if (showAccountSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAccountSelector]);

  // Show account picker modal when connected but no account selected
  useEffect(() => {
    if (isConnected && accounts.length > 0 && !selectedAccount) {
      setShowAccountPickerModal(true);
    }
  }, [isConnected, accounts, selectedAccount]);

  // Fetch identities for all connected accounts
  useEffect(() => {
    if (isConnected && accounts.length > 0) {
      const fetchIdentities = async () => {
        try {
          const addresses = accounts.map(acc => acc.address);
          const response = await fetch('/api/identity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses })
          });

          const data = await response.json();

          if (data.success && data.identities) {
            // Convert array of identities to address-keyed object
            const identityMap: Record<string, IdentityData> = {};
            data.identities.forEach((identity: { address: string; display?: string }) => {
              if (identity.display) {
                identityMap[identity.address] = { display: identity.display };
              }
            });
            setIdentities(identityMap);
          }
        } catch (err) {
          console.error('Failed to fetch identities:', err);
        }
      };

      fetchIdentities();
    }
  }, [isConnected, accounts]);

  const handleConnect = async () => {
    if (availableExtensions.length === 0) {
      // Redirect to FAQ instead of showing alert
      window.location.href = '/how-it-works#wallet-installation';
      return;
    }

    await connectWallet();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get display for minimized button (just account name)
  const getMinimizedDisplay = (account: InjectedAccount) => {
    return account.name || formatAddress(account.address);
  };

  // Get full display with identity for dropdown
  const getFullDisplay = (account: InjectedAccount) => {
    const identity = identities[account.address];
    const identityOrAnon = identity?.display || 'anon';

    if (account.name) {
      return {
        primary: `${account.name} (${identityOrAnon})`,
        secondary: formatAddress(account.address)
      };
    }

    return {
      primary: identityOrAnon,
      secondary: formatAddress(account.address)
    };
  };

  // Account picker modal - shown when connected but no account selected
  if (showAccountPickerModal && isConnected && accounts.length > 0 && !selectedAccount) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="bg-black/90 border-2 border-parity-pink/50 rounded-xl shadow-2xl w-full max-w-md my-auto backdrop-blur-xl">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white mb-2">Select Account</h2>
            <p className="text-sm text-gray-400">
              Choose which account you want to use for minting
            </p>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {accounts.map((account) => {
              const identity = identities[account.address];
              const identityOrAnon = identity?.display || 'anon';

              return (
                <button
                  key={account.address}
                  onClick={() => {
                    selectAccount(account.address);
                    setShowAccountPickerModal(false);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg transition-colors hover:bg-gray-800 text-gray-300 mb-1 border border-gray-700 hover:border-parity-pink"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {account.name && (
                        <p className="text-sm font-medium text-white mb-1">
                          {account.name} ({identityOrAnon})
                        </p>
                      )}
                      {!account.name && (
                        <p className="text-sm font-medium text-white mb-1">{identityOrAnon}</p>
                      )}
                      <p className="text-xs font-mono text-gray-400 break-all">{account.address}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => {
                disconnectWallet();
                setShowAccountPickerModal(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Cancel & Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && selectedAccount) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowAccountSelector(!showAccountSelector)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {getMinimizedDisplay(selectedAccount)}
          </span>
        </button>

        {showAccountSelector && (
          <div className="absolute right-0 mt-2 w-80 bg-black/90 border-2 border-parity-pink/50 rounded-lg shadow-xl z-50 backdrop-blur-xl">
            <div className="p-4 border-b border-gray-700">
              <p className="text-sm text-gray-400">Connected with {selectedAccount.source}</p>
            </div>

            {accounts.length > 1 && (
              <div className="p-2 max-h-60 overflow-y-auto">
                <p className="px-2 py-1 text-xs text-gray-500 uppercase">Switch Account</p>
                {accounts.map((account) => {
                  const display = getFullDisplay(account);
                  return (
                    <button
                      key={account.address}
                      onClick={() => {
                        selectAccount(account.address);
                        setShowAccountSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors mb-1 ${
                        account.address === selectedAccount.address
                          ? 'bg-pink-500/20 text-pink-300 border border-parity-pink'
                          : 'hover:bg-gray-800 text-gray-300 border border-gray-700 hover:border-parity-pink'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{display.primary}</p>
                          <p className="text-xs font-mono opacity-75">{display.secondary}</p>
                        </div>
                        {account.address === selectedAccount.address && (
                          <div className="w-2 h-2 bg-pink-400 rounded-full flex-shrink-0 ml-2"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowAccountSelector(false);
                }}
                className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      {!isConnecting && availableExtensions.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          No wallet detected.{' '}
          <a
            href="/how-it-works#wallet-installation"
            className="text-pink-400 hover:underline"
          >
            Learn how to install a wallet
          </a>
        </p>
      )}
    </div>
  );
}
