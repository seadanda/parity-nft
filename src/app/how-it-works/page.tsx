'use client';

import { Card } from '@/components/ui';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Mail,
  Eye,
  Shield,
  Database,
  Lock,
  Fingerprint,
  Globe,
  ChevronDown,
  ExternalLink,
  Code2,
  Network,
  GitBranch,
  Server,
  AlertCircle,
} from 'lucide-react';

export default function HowItWorksPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Static starfield background (matching the homepage)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create static stars
    const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
    const numStars = 100;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    const render = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    const handleResize = () => {
      resizeCanvas();
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
        });
      }
      render();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <main className="min-h-screen pt-24 px-4 relative">
      {/* Static Starfield Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
      />

      <div className="max-w-4xl mx-auto relative z-10 pb-24">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gradient-pink-purple">
            How It Works
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            A comprehensive guide to the 10 Years of Parity NFT celebration: from minting to viewing your unique 3D artwork.
          </p>
        </div>

        {/* What Is This? */}
        <section className="mb-16">
          <Card glass className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gradient-pink-purple">
              What Is This?
            </h2>
            <p className="text-lg text-text-muted mb-4">
              The 10 Years of Parity NFT is a unique 3D visualization celebrating a decade of innovation.
              Each NFT features a glass-effect Parity logo with:
            </p>
            <ul className="space-y-3 text-text-muted ml-6">
              <li className="flex items-start">
                <Sparkles className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-parity-pink" />
                <span><strong>Deterministic rarity</strong> - 12 unique tiers from Common to Legendary</span>
              </li>
              <li className="flex items-start">
                <Eye className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-parity-purple" />
                <span><strong>3D visualization</strong> - Real-time WebGL rendering with glass effects and bloom</span>
              </li>
              <li className="flex items-start">
                <Lock className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-parity-indigo" />
                <span><strong>Soulbound token</strong> - Permanently linked to your wallet, cannot be transferred</span>
              </li>
              <li className="flex items-start">
                <Database className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-parity-cyan" />
                <span><strong>On-chain storage</strong> - Minted on Polkadot Asset Hub for permanent availability</span>
              </li>
            </ul>
          </Card>
        </section>

        {/* The Minting Flow */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-10 text-gradient-pink-purple">
            The Minting Flow
          </h2>
          <div className="space-y-6">
            {/* Step 1: Whitelist */}
            <Card glass className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-parity-pink to-parity-purple flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <Mail className="w-6 h-6" />
                    Email Whitelist Verification
                  </h3>
                  <p className="text-text-muted mb-4">
                    Only pre-approved email addresses can participate in this exclusive mint. We use email verification to ensure fair distribution among Parity team members and partners.
                  </p>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm">How it works:</h4>
                    <ol className="space-y-2 text-sm text-text-muted ml-4 list-decimal">
                      <li>Enter your email address</li>
                      <li>Receive a 6-digit verification code (valid for 10 minutes)</li>
                      <li>Enter the code to authenticate</li>
                      <li>One mint per email address</li>
                    </ol>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 2: Mint */}
            <Card glass className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-parity-purple to-parity-indigo flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    Mint Your NFT
                  </h3>
                  <p className="text-text-muted mb-4">
                    Connect your Polkadot wallet and mint your unique NFT to Polkadot Asset Hub. Each NFT receives a deterministic hash that generates its visual properties.
                  </p>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm">What happens:</h4>
                    <ul className="space-y-2 text-sm text-text-muted ml-4 list-disc">
                      <li>A unique 66-character Koda hash is generated (0x + 64 hex characters)</li>
                      <li>The hash deterministically selects your rarity tier using weighted probabilities</li>
                      <li>NFT is minted on Polkadot Asset Hub (Parachain 1000)</li>
                      <li>Transfer is immediately locked (soulbound token)</li>
                      <li>Metadata with your hash is stored on-chain</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 3: View */}
            <Card glass className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-parity-indigo to-parity-cyan flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <Eye className="w-6 h-6" />
                    View Your NFT
                  </h3>
                  <p className="text-text-muted mb-4">
                    Your NFT can be viewed on multiple platforms. The 3D visualization is rendered in real-time from your unique hash.
                  </p>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm">Where to view:</h4>
                    <ul className="space-y-2 text-sm text-text-muted ml-4 list-disc">
                      <li><strong>Subscan</strong> - View on-chain details and transaction history</li>
                      <li><strong>Nova Wallet</strong> - Mobile wallet with NFT gallery</li>
                      <li><strong>KodaDot</strong> - NFT marketplace with metadata display</li>
                      <li><strong>3D Viewer</strong> - Interactive WebGL visualization (this site)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mb-16">
          <Card glass className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gradient-pink-purple">
              Technology Stack
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-parity-pink" />
                  3D Visualization
                </h3>
                <ul className="space-y-2 text-text-muted text-sm ml-6 list-disc">
                  <li><strong>Three.js</strong> - WebGL 3D rendering engine</li>
                  <li><strong>MeshPhysicalMaterial</strong> - Realistic glass effects</li>
                  <li><strong>UnrealBloomPass</strong> - Post-processing glow</li>
                  <li><strong>Custom shaders</strong> - Edge glow and iridescence</li>
                  <li><strong>HDR lighting</strong> - Environment-mapped reflections</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-parity-purple" />
                  Blockchain
                </h3>
                <ul className="space-y-2 text-text-muted text-sm ml-6 list-disc">
                  <li><strong>Polkadot Asset Hub</strong> - System parachain for NFTs</li>
                  <li><strong>@polkadot/api</strong> - JavaScript SDK</li>
                  <li><strong>pallet-nfts</strong> - On-chain NFT functionality</li>
                  <li><strong>pallet-proxy</strong> - Secure minting pattern</li>
                  <li><strong>IPFS</strong> - Decentralized metadata storage</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* The Rarity System */}
        <section className="mb-16">
          <Card glass className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gradient-pink-purple flex items-center gap-2">
              <Fingerprint className="w-8 h-8" />
              The Rarity System
            </h2>
            <p className="text-lg text-text-muted mb-6">
              Each NFT is assigned a tier using deterministic weighted randomness. The same hash always produces the same tier, colors, and mint ID.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Tier</th>
                    <th className="text-left py-3 px-4">Weight</th>
                    <th className="text-left py-3 px-4">Rarity</th>
                    <th className="text-left py-3 px-4">Est. %</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Graphite</td>
                    <td className="py-3 px-4">20</td>
                    <td className="py-3 px-4">Most Common</td>
                    <td className="py-3 px-4">~30%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Bronze</td>
                    <td className="py-3 px-4">12</td>
                    <td className="py-3 px-4">Common</td>
                    <td className="py-3 px-4">~18%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Silver</td>
                    <td className="py-3 px-4">8</td>
                    <td className="py-3 px-4">Uncommon</td>
                    <td className="py-3 px-4">~12%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Copper</td>
                    <td className="py-3 px-4">8</td>
                    <td className="py-3 px-4">Uncommon</td>
                    <td className="py-3 px-4">~12%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Emerald</td>
                    <td className="py-3 px-4">5</td>
                    <td className="py-3 px-4">Rare</td>
                    <td className="py-3 px-4">~8%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Sapphire</td>
                    <td className="py-3 px-4">3</td>
                    <td className="py-3 px-4">Very Rare</td>
                    <td className="py-3 px-4">~5%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Green</td>
                    <td className="py-3 px-4">3</td>
                    <td className="py-3 px-4">Very Rare</td>
                    <td className="py-3 px-4">~5%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Ruby</td>
                    <td className="py-3 px-4">2</td>
                    <td className="py-3 px-4">Ultra Rare</td>
                    <td className="py-3 px-4">~3%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Gold</td>
                    <td className="py-3 px-4">1.5</td>
                    <td className="py-3 px-4">Ultra Rare</td>
                    <td className="py-3 px-4">~2%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Magenta</td>
                    <td className="py-3 px-4">0.5</td>
                    <td className="py-3 px-4">Legendary</td>
                    <td className="py-3 px-4">&lt;1%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">Obelisk</td>
                    <td className="py-3 px-4">0.5</td>
                    <td className="py-3 px-4">Legendary</td>
                    <td className="py-3 px-4">&lt;1%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Obelisk Ultra</td>
                    <td className="py-3 px-4">0.5</td>
                    <td className="py-3 px-4">Legendary</td>
                    <td className="py-3 px-4">&lt;1%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-background/50 rounded-lg p-4 border border-border">
              <h4 className="font-semibold mb-2 text-sm">Hash-to-Tier Algorithm</h4>
              <p className="text-sm text-text-muted">
                The algorithm uses KodaDot's standard hash-to-seed conversion (sum of 5 chunks of 12 hex characters),
                then applies weighted random selection. Same hash always produces the same tier.
              </p>
            </div>
          </Card>
        </section>

        {/* The Proxy Pattern (Security) */}
        <section className="mb-16">
          <Card glass className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gradient-pink-purple flex items-center gap-2">
              <Shield className="w-8 h-8" />
              The Proxy Pattern
            </h2>
            <p className="text-lg text-text-muted mb-6">
              We use Polkadot's proxy system to enable secure minting without exposing the collection owner's private keys.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">How it Works</h3>
                <ul className="space-y-2 text-text-muted ml-6 list-disc">
                  <li><strong>Bob (Collection Owner)</strong> - Holds the funds and owns the collection. Private keys remain offline.</li>
                  <li><strong>Charlie (Proxy Account)</strong> - Performs minting operations on Bob's behalf via <code className="bg-background/50 px-1 rounded">proxy.proxy()</code> calls.</li>
                  <li><strong>NonTransfer Proxy Type</strong> - Charlie can mint NFTs but cannot transfer Bob's funds.</li>
                  <li><strong>Fee Payment</strong> - All transaction fees and deposits are automatically paid by Bob.</li>
                  <li><strong>Revocability</strong> - Bob can remove Charlie's permissions instantly at any time.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2">Security Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm text-parity-pink">Separation of Duties</h4>
                    <p className="text-xs text-text-muted">Financial control (Bob) is separate from operations (Charlie)</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm text-parity-purple">Limited Permissions</h4>
                    <p className="text-xs text-text-muted">Proxy can only mint NFTs, not transfer funds or change ownership</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm text-parity-indigo">Key Protection</h4>
                    <p className="text-xs text-text-muted">Collection owner's private keys never exposed to operational systems</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm text-parity-cyan">Instant Revocation</h4>
                    <p className="text-xs text-text-muted">Proxy permissions can be removed immediately if compromised</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Deep Dive: Blockchain Call Flow */}
        <section className="mb-16">
          <Card glass className="p-8">
            <button
              onClick={() => toggleSection('blockchain-flow')}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-3xl font-bold text-gradient-pink-purple flex items-center gap-2">
                <GitBranch className="w-8 h-8" />
                Deep Dive: Blockchain Call Flow
              </h2>
              <ChevronDown
                className={`w-6 h-6 transition-transform ${
                  expandedSection === 'blockchain-flow' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'blockchain-flow' && (
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Transaction Structure</h3>
                  <p className="text-text-muted mb-4">
                    Each mint consists of a <strong>proxy-wrapped batch transaction</strong> that atomically executes three NFT operations:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border mb-4">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`// The complete transaction structure
api.tx.proxy.proxy(
  bobAddress,              // Real account (collection owner)
  null,                    // Use assigned proxy type (NonTransfer)
  api.tx.utility.batchAll([
    // Operation 1: Create the NFT
    api.tx.nfts.mint(
      collectionId,        // Collection ID
      itemId,              // Sequential NFT ID
      recipient,           // Recipient wallet address
      null                 // No witness data
    ),

    // Operation 2: Set metadata
    api.tx.nfts.setMetadata(
      collectionId,        // Collection ID
      itemId,              // NFT ID
      ipfsUrl              // ipfs://QmXxx.../metadata.json
    ),

    // Operation 3: Lock the NFT (soulbound)
    api.tx.nfts.lockItemTransfer(
      collectionId,        // Collection ID
      itemId               // NFT ID
    )
  ])
).signAndSend(charlie)     // Charlie signs, Bob pays fees`}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-pink">proxy.proxy()</h4>
                      <p className="text-xs text-text-muted">
                        Wraps the batch call, allowing Charlie to sign while Bob pays fees and owns the NFT.
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-purple">utility.batchAll()</h4>
                      <p className="text-xs text-text-muted">
                        Ensures atomic execution - all three operations succeed or all fail together.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Event Monitoring</h3>
                  <p className="text-text-muted mb-4">
                    The frontend monitors blockchain events to track mint progress:
                  </p>

                  <div className="space-y-3">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-parity-pink/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-parity-pink font-bold text-sm">1</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1">nfts.Issued</h4>
                          <p className="text-xs text-text-muted">
                            Emitted when the NFT is minted. Contains collection ID, item ID, and owner address.
                          </p>
                          <code className="text-xs bg-background/50 px-2 py-1 rounded mt-2 block">
                            event.data: [collectionId, itemId, owner]
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-parity-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-parity-purple font-bold text-sm">2</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1">nfts.ItemMetadataSet</h4>
                          <p className="text-xs text-text-muted">
                            Emitted when metadata is attached. Contains IPFS URL pointing to the NFT's metadata.
                          </p>
                          <code className="text-xs bg-background/50 px-2 py-1 rounded mt-2 block">
                            event.data: [collectionId, itemId, metadata]
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-parity-indigo/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-parity-indigo font-bold text-sm">3</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1">nfts.ItemTransferLocked</h4>
                          <p className="text-xs text-text-muted">
                            Emitted when transfer is locked. The NFT is now soulbound to the recipient.
                          </p>
                          <code className="text-xs bg-background/50 px-2 py-1 rounded mt-2 block">
                            event.data: [collectionId, itemId]
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-parity-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-parity-cyan font-bold text-sm">4</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1">proxy.ProxyExecuted</h4>
                          <p className="text-xs text-text-muted">
                            Emitted when the proxy call completes. Contains the result (Ok or Err).
                          </p>
                          <code className="text-xs bg-background/50 px-2 py-1 rounded mt-2 block">
                            event.data: [result: Result&lt;(), DispatchError&gt;]
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Transaction Lifecycle</h3>
                  <p className="text-text-muted mb-4">
                    A mint transaction goes through several stages on the blockchain:
                  </p>

                  <div className="bg-background/80 rounded-lg p-6 border border-border">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-pink">
                          1. Signing
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Charlie's private key signs the transaction. User sees signing prompt in wallet.
                        </div>
                      </div>
                      <div className="border-l-2 border-border ml-16 pl-4 py-2">
                        <code className="text-xs text-text-muted">Status: Ready</code>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-purple">
                          2. Submission
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Signed transaction is broadcast to the network and enters the transaction pool.
                        </div>
                      </div>
                      <div className="border-l-2 border-border ml-16 pl-4 py-2">
                        <code className="text-xs text-text-muted">Status: Future → Ready</code>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-indigo">
                          3. Inclusion
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Transaction is included in a block by a validator. Events are emitted.
                        </div>
                      </div>
                      <div className="border-l-2 border-border ml-16 pl-4 py-2">
                        <code className="text-xs text-text-muted">Status: InBlock (blockHash)</code>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-cyan">
                          4. Finalization
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Block is finalized by GRANDPA consensus. Transaction is now irreversible.
                        </div>
                      </div>
                      <div className="border-l-2 border-border ml-16 pl-4 py-2">
                        <code className="text-xs text-text-muted">Status: Finalized (blockHash)</code>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-parity-cyan/10 rounded-lg p-4 border border-parity-cyan/30">
                    <p className="text-sm text-text-muted">
                      <strong className="text-parity-cyan">Note:</strong> On Polkadot Asset Hub, finalization typically occurs within 12-18 seconds (2-3 blocks at 6-second block time).
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Fee Payment Mechanism</h3>
                  <p className="text-text-muted mb-4">
                    The proxy pattern enables <strong>separated fee payment</strong>:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-pink flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Who Signs: Charlie (Proxy)
                      </h4>
                      <ul className="text-xs text-text-muted space-y-1 ml-4 list-disc">
                        <li>Signs the transaction with his private key</li>
                        <li>Private key stored in secure backend</li>
                        <li>Can be rotated if compromised</li>
                        <li>Limited to NonTransfer proxy type</li>
                      </ul>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-purple flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Who Pays: Bob (Owner)
                      </h4>
                      <ul className="text-xs text-text-muted space-y-1 ml-4 list-disc">
                        <li>All transaction fees deducted from Bob's balance</li>
                        <li>NFT deposit (~0.010 DOT) paid by Bob</li>
                        <li>Private keys remain offline and secure</li>
                        <li>Can revoke Charlie's permissions anytime</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 bg-background/80 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-3 text-sm">Fee Breakdown per Mint:</h4>
                    <table className="w-full text-xs">
                      <tbody className="text-text-muted">
                        <tr className="border-b border-border/50">
                          <td className="py-2">NFT Mint Deposit</td>
                          <td className="py-2 text-right font-mono">~0.0100 DOT</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Set Metadata Fee</td>
                          <td className="py-2 text-right font-mono">~0.0010 DOT</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Lock Transfer Fee</td>
                          <td className="py-2 text-right font-mono">~0.0010 DOT</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Proxy Call Overhead</td>
                          <td className="py-2 text-right font-mono">~0.0005 DOT</td>
                        </tr>
                        <tr className="font-bold text-parity-cyan">
                          <td className="py-2">Total</td>
                          <td className="py-2 text-right font-mono">~0.0125 DOT</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Deep Dive: IPFS Hosting & Pinning */}
        <section className="mb-16">
          <Card glass className="p-8">
            <button
              onClick={() => toggleSection('ipfs-hosting')}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-3xl font-bold text-gradient-pink-purple flex items-center gap-2">
                <Server className="w-8 h-8" />
                Deep Dive: IPFS Hosting & Pinning
              </h2>
              <ChevronDown
                className={`w-6 h-6 transition-transform ${
                  expandedSection === 'ipfs-hosting' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'ipfs-hosting' && (
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4">What is IPFS?</h3>
                  <p className="text-text-muted mb-4">
                    <strong>InterPlanetary File System (IPFS)</strong> is a peer-to-peer distributed file system. Unlike traditional HTTP, IPFS uses <strong>content addressing</strong> - files are identified by their cryptographic hash (CID), not their location.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-pink">Traditional HTTP</h4>
                      <code className="text-xs text-text-muted break-all">
                        https://example.com/nft/123.json
                      </code>
                      <p className="text-xs text-text-muted mt-2">
                        Location-based: If server goes down, content is lost.
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-purple">IPFS</h4>
                      <code className="text-xs text-text-muted break-all">
                        ipfs://QmX.../metadata.json
                      </code>
                      <p className="text-xs text-text-muted mt-2">
                        Content-based: Available as long as any node has the file.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Content Identifiers (CIDs)</h3>
                  <p className="text-text-muted mb-4">
                    A <strong>CID (Content Identifier)</strong> is a cryptographic hash that uniquely identifies content. Same content = same CID, always.
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm">Example CID Breakdown:</h4>
                    <code className="text-xs text-text-muted break-all block mb-3">
                      QmX4dKzGMXjNBvZSjYxjxfBWfxwMNNEwKXQMwF2LFjQXpK
                    </code>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-background/50 rounded p-2 border border-border">
                        <div className="font-semibold text-parity-pink mb-1">Qm</div>
                        <div className="text-text-muted">Version prefix</div>
                      </div>
                      <div className="bg-background/50 rounded p-2 border border-border col-span-2">
                        <div className="font-semibold text-parity-purple mb-1">X4dKz...FjQXpK</div>
                        <div className="text-text-muted">Base58-encoded SHA-256 hash</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-parity-cyan/10 rounded-lg p-4 border border-parity-cyan/30">
                    <p className="text-sm text-text-muted">
                      <strong className="text-parity-cyan">Immutability:</strong> If content changes even by a single byte, the CID changes completely. This ensures integrity.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Adding Files to IPFS</h3>
                  <p className="text-text-muted mb-4">
                    Files are added to IPFS using the <code className="bg-background/50 px-1 rounded">ipfs add</code> command:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border mb-4">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`# Add a single file
ipfs add metadata.json
> added QmX4dKz... metadata.json

# Add a directory recursively
ipfs add -r staging/
> added QmAbc123... staging/viewer.html
> added QmDef456... staging/logo.glb
> added QmGhi789... staging
>
> Directory CID: QmGhi789...

# Files are now in local IPFS node`}
                    </pre>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-pink/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-pink font-bold text-sm">1</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">File Chunking</h4>
                        <p className="text-xs text-text-muted">
                          Large files are split into 256KB chunks. Each chunk gets its own CID.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-purple font-bold text-sm">2</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">DAG Construction</h4>
                        <p className="text-xs text-text-muted">
                          Chunks are organized into a Merkle DAG (Directed Acyclic Graph). Root CID represents the entire file.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-indigo/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-indigo font-bold text-sm">3</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Local Storage</h4>
                        <p className="text-xs text-text-muted">
                          Content is stored in your local IPFS node's datastore (~/.ipfs/blocks/).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Pinning: Keeping Content Available</h3>
                  <p className="text-text-muted mb-4">
                    By default, IPFS nodes only keep content temporarily. <strong>Pinning</strong> ensures content stays available permanently.
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border mb-4">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`# Pin a CID locally
ipfs pin add QmX4dKzGMXjNBvZSjYxjxfBWfxwMNNEwKXQMwF2LFjQXpK
> pinned QmX4dKz... recursively

# List all pins
ipfs pin ls --type=recursive
> QmX4dKz... recursive

# Pin will survive garbage collection
ipfs repo gc
> content with QmX4dKz... is protected`}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-pink">Local Pinning</h4>
                      <p className="text-xs text-text-muted">
                        Pin on your own IPFS node. Free, but requires keeping your node online.
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-purple">Pinata</h4>
                      <p className="text-xs text-text-muted">
                        Managed pinning service. Upload via API, they handle availability.
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-indigo">Web3.Storage</h4>
                      <p className="text-xs text-text-muted">
                        Free decentralized storage backed by Filecoin for long-term persistence.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Gateway Access</h3>
                  <p className="text-text-muted mb-4">
                    IPFS content can be accessed via <strong>HTTP gateways</strong> for browser compatibility:
                  </p>

                  <div className="space-y-3">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm">Local Gateway (localhost:8080)</h4>
                      <code className="text-xs text-text-muted break-all block">
                        http://localhost:8080/ipfs/QmX4dKz.../metadata.json
                      </code>
                      <p className="text-xs text-text-muted mt-2">
                        Fastest access if you're running a local IPFS node.
                      </p>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm">Public Gateways (ipfs.io)</h4>
                      <code className="text-xs text-text-muted break-all block">
                        https://ipfs.io/ipfs/QmX4dKz.../metadata.json
                      </code>
                      <p className="text-xs text-text-muted mt-2">
                        Protocol Labs' public gateway. Can be slow during high traffic.
                      </p>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm">Cloudflare IPFS Gateway</h4>
                      <code className="text-xs text-text-muted break-all block">
                        https://cloudflare-ipfs.com/ipfs/QmX4dKz.../metadata.json
                      </code>
                      <p className="text-xs text-text-muted mt-2">
                        Fast, globally distributed gateway with CDN caching.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 bg-parity-pink/10 rounded-lg p-4 border border-parity-pink/30">
                    <p className="text-sm text-text-muted">
                      <strong className="text-parity-pink">Gateway Timeout:</strong> First request for unpinned content may take 30-60 seconds as the gateway fetches it from the DHT.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Metadata Structure on IPFS</h3>
                  <p className="text-text-muted mb-4">
                    Each NFT's metadata is stored as a JSON file on IPFS:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`{
  "name": "10 Years of Parity #42",
  "description": "A commemorative NFT celebrating Parity's 10-year milestone",
  "image": "ipfs://QmAbc123.../preview.png",
  "animation_url": "ipfs://QmDef456.../viewer.html?hash=0x175adf...",
  "attributes": [
    {
      "trait_type": "Tier",
      "value": "Sapphire"
    },
    {
      "trait_type": "Glass Color",
      "value": "#2d5ee8"
    },
    {
      "trait_type": "Glow Color",
      "value": "#5e8eff"
    },
    {
      "trait_type": "Mint ID",
      "value": "A3F2C891"
    }
  ],
  "external_url": "https://parity.io",
  "background_color": "0A0A0F"
}`}
                    </pre>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-pink">image</h4>
                      <p className="text-xs text-text-muted">
                        Static preview PNG for wallets and marketplaces that don't support 3D.
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-purple">animation_url</h4>
                      <p className="text-xs text-text-muted">
                        Interactive 3D viewer hosted on IPFS with deterministic hash parameter.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">DHT: Distributed Hash Table</h3>
                  <p className="text-text-muted mb-4">
                    IPFS uses a <strong>DHT (Kademlia)</strong> to track which peers have which content:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-pink/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-pink font-bold text-sm">1</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Provider Records</h4>
                        <p className="text-xs text-text-muted">
                          When you pin content, your node announces to the DHT: "I have CID QmX4dKz..."
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-purple font-bold text-sm">2</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">DHT Lookup</h4>
                        <p className="text-xs text-text-muted">
                          When someone requests the CID, the DHT query finds which peers are providing it.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-indigo/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-indigo font-bold text-sm">3</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Content Retrieval</h4>
                        <p className="text-xs text-text-muted">
                          Node connects directly to providers and downloads content via Bitswap protocol.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-background/80 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm">Propagation Time:</h4>
                    <p className="text-xs text-text-muted">
                      After uploading to IPFS, it takes <strong>~5-15 minutes</strong> for provider records to fully propagate across the DHT. During this time, content may only be available via the original uploader's node.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Complete Upload Workflow</h3>
                  <div className="bg-background/80 rounded-lg p-6 border border-border">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-pink">
                          1. Prepare Files
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Organize viewer files (HTML, 3D model, HDR) in staging directory
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-purple">
                          2. Add to IPFS
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          <code className="text-xs bg-background/50 px-2 py-1 rounded">ipfs add -r staging/</code> - Get CID for directory
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-indigo">
                          3. Pin Locally
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          <code className="text-xs bg-background/50 px-2 py-1 rounded">ipfs pin add QmXxx</code> - Protect from garbage collection
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-cyan">
                          4. Pin with Pinata
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Upload via Pinata API for redundant, managed hosting
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-pink">
                          5. Generate Metadata
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Create metadata.json with viewer URL: <code className="text-xs bg-background/50 px-1 rounded">ipfs://QmXxx/viewer.html?hash=0x...</code>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-purple">
                          6. Upload Metadata
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Add metadata.json to IPFS, get metadata CID
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 text-sm font-semibold text-parity-indigo">
                          7. Set On-Chain
                        </div>
                        <div className="flex-1 text-sm text-text-muted">
                          Call <code className="text-xs bg-background/50 px-1 rounded">nfts.setMetadata()</code> with metadata CID
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Deep Dive: Metadata Flow */}
        <section className="mb-16">
          <Card glass className="p-8">
            <button
              onClick={() => toggleSection('metadata-flow')}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-3xl font-bold text-gradient-pink-purple flex items-center gap-2">
                <Code2 className="w-8 h-8" />
                Deep Dive: Metadata Flow
              </h2>
              <ChevronDown
                className={`w-6 h-6 transition-transform ${
                  expandedSection === 'metadata-flow' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'metadata-flow' && (
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 1: Hash Generation</h3>
                  <p className="text-text-muted mb-4">
                    Each NFT gets a unique 66-character <strong>Koda hash</strong> that deterministically generates its visual properties:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border mb-4">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`// Generate Koda-format hash
const hash = \`0x\${Array.from({ length: 64 }, () =>
  Math.floor(Math.random() * 16).toString(16)
).join('')}\`;

// Example output:
// 0x175adf5fc058830a6319b8238ecc911db6e1b8dd40965629b5f0c5bee655598c
//   ^^ prefix (required)
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 64 hex chars`}
                    </pre>
                  </div>

                  <div className="bg-parity-cyan/10 rounded-lg p-4 border border-parity-cyan/30">
                    <p className="text-sm text-text-muted">
                      <strong className="text-parity-cyan">Strict Validation:</strong> Hash must match <code className="bg-background/50 px-1 rounded">/^0x[0-9a-fA-F]{'{'}64{'}'}/</code> or generation fails.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 2: Hash-to-Seed Conversion</h3>
                  <p className="text-text-muted mb-4">
                    The hash is converted to a numeric seed using <strong>KodaDot's standard algorithm</strong>:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`// KodaDot's hash-to-seed algorithm
function hashToSeed(hash: string): number {
  // Remove '0x' prefix
  const hexString = hash.substring(2); // 64 hex chars

  // Sum 5 chunks of 12 hex characters each (60 chars total)
  let seed = 0;
  for (let i = 0; i < 60; i += 12) {
    const chunk = hexString.substring(i, i + 12);
    seed += parseInt(chunk, 16); // Parse as base-16 integer
  }

  return seed;
}

// Example:
// hash: 0x175adf5fc058830a6319b8238ecc911db6e1b8dd40965629b5f0c5bee655598c
//          ^^^^^^^^^^^^                                        chunk 1
//                      ^^^^^^^^^^^^                            chunk 2
//                                  ^^^^^^^^^^^^                chunk 3
//                                              ^^^^^^^^^^^^    chunk 4
//                                                          ^^^^^^^^^^^^  chunk 5
//
// seed = 0x175adf5fc058 + 0x830a6319b823 + 0x8ecc911db6e1 +
//        0xb8dd40965629 + 0xb5f0c5bee655
// seed = 25928479563864 + 144851254879267 + 156320448370401 +
//        202844917769769 + 199878853321301
// seed = 729823953904602`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 3: Seeded Random Number Generation</h3>
                  <p className="text-text-muted mb-4">
                    The seed initializes a <strong>Mulberry32 PRNG</strong> for deterministic randomness:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Mulberry32 algorithm - high-quality 32-bit PRNG
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Usage:
const rng = new SeededRandom(seed);
const random1 = rng.next(); // 0.673845...
const random2 = rng.next(); // 0.291033...
// Same seed always produces same sequence`}
                    </pre>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-pink">Deterministic</h4>
                      <p className="text-xs text-text-muted">
                        Same seed produces identical sequence of random numbers every time.
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 text-sm text-parity-purple">High Quality</h4>
                      <p className="text-xs text-text-muted">
                        Mulberry32 has good statistical properties and passes randomness tests.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 4: Tier Selection</h3>
                  <p className="text-text-muted mb-4">
                    The PRNG selects a tier using <strong>weighted random selection</strong>:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border mb-4">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`const TIERS = [
  { name: 'Graphite', weight: 20, glassColor: '#808080', glowColor: '#b0b0b0' },
  { name: 'Bronze', weight: 12, glassColor: '#cd7f32', glowColor: '#e9b869' },
  { name: 'Silver', weight: 8, glassColor: '#c0c0c0', glowColor: '#f0f0f0' },
  // ... 9 more tiers
];

function pickWeightedTier(rng: SeededRandom) {
  const totalWeight = TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let random = rng.next() * totalWeight; // 0 to totalWeight

  for (const tier of TIERS) {
    random -= tier.weight;
    if (random <= 0) {
      return tier; // Selected!
    }
  }

  return TIERS[TIERS.length - 1]; // Fallback
}`}
                    </pre>
                  </div>

                  <div className="bg-parity-pink/10 rounded-lg p-4 border border-parity-pink/30">
                    <p className="text-sm text-text-muted">
                      <strong className="text-parity-pink">Example:</strong> If totalWeight = 64 and random = 15.3, it will select Bronze (weight 12 comes after Graphite's weight 20, so 15.3 - 20 = -4.7 ≤ 0).
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 5: Mint ID Generation</h3>
                  <p className="text-text-muted mb-4">
                    A deterministic <strong>Mint ID</strong> is generated from the hash and tier:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`function generateMintId(hash: string, tier: string): string {
  // Simple hash of hash + tier for consistent ID
  const input = hash + tier;
  let hash32 = 0;

  for (let i = 0; i < input.length; i++) {
    hash32 = ((hash32 << 5) - hash32) + input.charCodeAt(i);
    hash32 |= 0; // Convert to 32-bit integer
  }

  return Math.abs(hash32).toString(16).toUpperCase().padStart(8, '0');
}

// Example:
// hash: 0x175adf5fc058830a6319b8238ecc911db6e1b8dd40965629b5f0c5bee655598c
// tier: Sapphire
// mintId: A3F2C891`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 6: Metadata JSON Creation</h3>
                  <p className="text-text-muted mb-4">
                    All data is combined into an <strong>ERC-721 compatible metadata JSON</strong>:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`const metadata = {
  name: \`10 Years of Parity #\${itemId}\`,
  description: "A commemorative NFT celebrating Parity's 10-year milestone",

  // Static preview image (PNG)
  image: \`ipfs://\${previewCID}/preview.png\`,

  // Interactive 3D viewer with deterministic hash
  animation_url: \`ipfs://\${viewerCID}/index.html?hash=\${hash}\`,

  // Rarity attributes
  attributes: [
    { trait_type: "Tier", value: tier.name },
    { trait_type: "Glass Color", value: tier.glassColor },
    { trait_type: "Glow Color", value: tier.glowColor },
    { trait_type: "Mint ID", value: mintId }
  ],

  external_url: "https://parity.io",
  background_color: "0A0A0F"
};`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 7: Upload to IPFS</h3>
                  <p className="text-text-muted mb-4">
                    Metadata is uploaded to IPFS via <strong>Pinata API</strong>:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border mb-4">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`// Upload via Pinata API
const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${PINATA_JWT}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pinataContent: metadata,
    pinataMetadata: {
      name: \`parity-10-years-\${itemId}.json\`
    }
  })
});

const result = await response.json();
// result.IpfsHash = "QmX4dKzGMXjNBvZSjYxjxfBWfxwMNNEwKXQMwF2LFjQXpK"

const metadataUrl = \`ipfs://\${result.IpfsHash}\`;
// ipfs://QmX4dKzGMXjNBvZSjYxjxfBWfxwMNNEwKXQMwF2LFjQXpK`}
                    </pre>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-pink/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-pink font-bold text-sm">1</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Pinata Receives JSON</h4>
                        <p className="text-xs text-text-muted">
                          Metadata JSON is sent to Pinata's API endpoint
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-purple font-bold text-sm">2</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Content Hashing</h4>
                        <p className="text-xs text-text-muted">
                          Pinata computes the CID from the JSON content
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-indigo/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-indigo font-bold text-sm">3</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Pinning</h4>
                        <p className="text-xs text-text-muted">
                          Content is pinned to Pinata's IPFS nodes for permanent availability
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-parity-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-parity-cyan font-bold text-sm">4</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">CID Returned</h4>
                        <p className="text-xs text-text-muted">
                          Pinata returns the CID, which is used in the blockchain transaction
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step 8: On-Chain Metadata Pointer</h3>
                  <p className="text-text-muted mb-4">
                    The IPFS CID is set as the NFT's metadata using <code className="bg-background/50 px-1 rounded">nfts.setMetadata()</code>:
                  </p>

                  <div className="bg-background/80 rounded-lg p-4 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`// Set metadata in batch transaction
api.tx.nfts.setMetadata(
  collectionId,  // 123
  itemId,        // 42
  metadataUrl    // "ipfs://QmX4dKzGMXjNBvZSjYxjxfBWfxwMNNEwKXQMwF2LFjQXpK"
)

// Stored on-chain:
// Collection 123, Item 42 -> ipfs://QmX4dKz...`}
                    </pre>
                  </div>

                  <div className="mt-4 bg-parity-indigo/10 rounded-lg p-4 border border-parity-indigo/30">
                    <p className="text-sm text-text-muted">
                      <strong className="text-parity-indigo">On-Chain Storage:</strong> Only the IPFS URL (&lt; 100 bytes) is stored on-chain. The actual metadata lives on IPFS, keeping blockchain storage costs minimal.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Complete Flow Diagram</h3>
                  <div className="bg-background/80 rounded-lg p-6 border border-border">
                    <pre className="text-xs text-text-muted overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────────┐
│                         METADATA FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

1. Generate Hash
   0x175adf5fc058830a6319b8238ecc911db6e1b8dd40965629b5f0c5bee655598c
                              │
                              ▼
2. Hash → Seed (KodaDot algorithm)
   Sum 5 chunks of 12 hex chars
   → seed: 729823953904602
                              │
                              ▼
3. Seed → PRNG
   Mulberry32(seed)
   → deterministic random sequence
                              │
                              ▼
4. PRNG → Tier Selection
   Weighted random from 12 tiers
   → Sapphire (weight: 3)
                              │
                              ▼
5. Generate Mint ID
   hash(hash + tier)
   → A3F2C891
                              │
                              ▼
6. Create Metadata JSON
   {
     name: "10 Years of Parity #42",
     image: "ipfs://Qm.../preview.png",
     animation_url: "ipfs://Qm.../viewer.html?hash=0x175adf...",
     attributes: [tier, colors, mintId]
   }
                              │
                              ▼
7. Upload to IPFS (Pinata)
   POST /pinning/pinJSONToIPFS
   → CID: QmX4dKzGMXjNBvZSjYxjxfBWfxwMNNEwKXQMwF2LFjQXpK
                              │
                              ▼
8. Set On-Chain Metadata
   nfts.setMetadata(123, 42, "ipfs://QmX4dKz...")
   → Metadata pointer stored in NFT pallet

┌─────────────────────────────────────────────────────────────────────┐
│ Result: NFT #42 has deterministic visualization from hash           │
│ Same hash → Same tier → Same colors → Same 3D artwork              │
└─────────────────────────────────────────────────────────────────────┘`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* NFT Properties */}
        <section className="mb-16">
          <Card glass className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gradient-pink-purple">
              NFT Properties
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-parity-pink" />
                  Soulbound Token
                </h3>
                <p className="text-text-muted">
                  Your NFT is permanently locked to your wallet address and cannot be transferred. This commemorative token represents your connection to Parity's 10-year milestone.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-parity-purple" />
                  Deterministic Visualization
                </h3>
                <p className="text-text-muted">
                  The 3D artwork is generated deterministically from your unique hash. No images are stored - the visualization is rendered in real-time using WebGL, always producing the same result from your hash.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-parity-indigo" />
                  On-Chain Metadata
                </h3>
                <p className="text-text-muted">
                  Your NFT's metadata (including the hash) is stored permanently on Polkadot Asset Hub. The metadata points to an IPFS URL that contains the viewer with your unique hash parameter.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Where to View */}
        <section className="mb-16">
          <Card glass className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gradient-pink-purple">
              Where to View Your NFT
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-background/50 rounded-lg p-6 border border-border hover:border-parity-pink transition-colors">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  Subscan
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-text-muted mb-3">
                  View on-chain transaction history, block details, and NFT metadata.
                </p>
                <a
                  href="https://assethub-polkadot.subscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-parity-pink hover:underline"
                >
                  assethub-polkadot.subscan.io
                </a>
              </div>

              <div className="bg-background/50 rounded-lg p-6 border border-border hover:border-parity-purple transition-colors">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  Nova Wallet
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-text-muted mb-3">
                  Mobile wallet with built-in NFT gallery for iOS and Android.
                </p>
                <a
                  href="https://novawallet.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-parity-purple hover:underline"
                >
                  novawallet.io
                </a>
              </div>

              <div className="bg-background/50 rounded-lg p-6 border border-border hover:border-parity-indigo transition-colors">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  KodaDot
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-text-muted mb-3">
                  Polkadot NFT marketplace with full metadata display and collection browsing.
                </p>
                <a
                  href="https://kodadot.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-parity-indigo hover:underline"
                >
                  kodadot.xyz
                </a>
              </div>

              <div className="bg-background/50 rounded-lg p-6 border border-border hover:border-parity-cyan transition-colors">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  3D Viewer (This Site)
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-text-muted mb-3">
                  Interactive WebGL visualization with real-time glass effects and bloom.
                </p>
                <p className="text-sm text-parity-cyan">
                  Use the viewer at /view/[hash] with your NFT's hash
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Technical Details (Collapsible) */}
        <section className="mb-16">
          <Card glass className="p-8">
            <button
              onClick={() => toggleSection('technical')}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-3xl font-bold text-gradient-pink-purple">
                Technical Details
              </h2>
              <ChevronDown
                className={`w-6 h-6 transition-transform ${
                  expandedSection === 'technical' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'technical' && (
              <div className="mt-6 space-y-6">
                <div className="bg-parity-indigo/10 border border-parity-indigo/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-parity-cyan" />
                    KodaDot Format Compatibility (Not Using Their Platform)
                  </h3>
                  <p className="text-text-muted mb-4">
                    <strong>Important:</strong> We are <strong>NOT</strong> using KodaDot's minting platform. We're deploying our own independent minting system with full control and no third-party dependencies.
                  </p>
                  <p className="text-text-muted mb-4">
                    However, we <strong>use KodaDot's hash format</strong> for compatibility with standard NFT viewers and wallets:
                  </p>
                  <ul className="space-y-2 text-sm text-text-muted ml-6 list-disc mb-4">
                    <li><strong>Standard format:</strong> 66-character hash (0x + 64 hex) used by many Polkadot NFT projects</li>
                    <li><strong>Hash-to-seed algorithm:</strong> Industry-standard deterministic randomness</li>
                    <li><strong>Viewer compatibility:</strong> NFTs work in Nova Wallet, Subscan, and other standard viewers</li>
                    <li><strong>No trust required:</strong> We control the entire minting process, keys, and metadata</li>
                  </ul>
                  <div className="bg-background/30 rounded p-3 text-sm">
                    <strong>Why not KodaDot's platform?</strong>
                    <ul className="mt-2 space-y-1 ml-4 list-disc text-text-muted">
                      <li>Limited generative art support requiring platform-specific integration</li>
                      <li>Requires trusting third-party infrastructure</li>
                      <li>We want full control over the minting process and security</li>
                      <li>Direct blockchain interaction is more transparent and auditable</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Rendering Pipeline</h3>
                  <p className="text-text-muted mb-3">
                    The 3D viewer uses a sophisticated Three.js rendering pipeline:
                  </p>
                  <ul className="space-y-2 text-sm text-text-muted ml-6 list-disc">
                    <li><strong>Scene Setup</strong> - Camera positioned along +Y axis, logo centered at origin</li>
                    <li><strong>Material System</strong> - MeshPhysicalMaterial with transmission, roughness, IOR</li>
                    <li><strong>Post-Processing</strong> - EffectComposer with UnrealBloomPass for glow</li>
                    <li><strong>Overlay System</strong> - Multiple render-order layers for glass, edge glow, iridescence</li>
                    <li><strong>Starfield</strong> - Sparse point cloud with slow rotation beyond radius 300</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Hash Format</h3>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <p className="text-sm text-text-muted mb-2">
                      <strong>Format:</strong> 0x + 64 hexadecimal characters (66 total)
                    </p>
                    <p className="text-sm text-text-muted mb-2">
                      <strong>Example:</strong> <code className="bg-background px-1 rounded text-xs break-all">0x175adf5fc058830a6319b8238ecc911db6e1b8dd40965629b5f0c5bee655598c</code>
                    </p>
                    <p className="text-sm text-text-muted">
                      <strong>Validation:</strong> Strict regex matching, rejects invalid formats
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Cost Breakdown</h3>
                  <p className="text-text-muted mb-3">
                    Approximate costs per NFT on Polkadot Asset Hub:
                  </p>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <table className="w-full text-sm">
                      <tbody className="text-text-muted">
                        <tr className="border-b border-border/50">
                          <td className="py-2">Mint deposit</td>
                          <td className="py-2 text-right">~0.010 DOT</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Metadata fee</td>
                          <td className="py-2 text-right">~0.001 DOT</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Lock transfer fee</td>
                          <td className="py-2 text-right">~0.001 DOT</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Proxy overhead</td>
                          <td className="py-2 text-right">~0.0005 DOT</td>
                        </tr>
                        <tr className="font-bold">
                          <td className="py-2">Total per NFT</td>
                          <td className="py-2 text-right">~0.0125 DOT</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* FAQ (Collapsible) */}
        <section className="mb-16">
          <Card glass className="p-8">
            <button
              onClick={() => toggleSection('faq')}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-3xl font-bold text-gradient-pink-purple">
                Frequently Asked Questions
              </h2>
              <ChevronDown
                className={`w-6 h-6 transition-transform ${
                  expandedSection === 'faq' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'faq' && (
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">Can I transfer my NFT to another wallet?</h3>
                  <p className="text-text-muted text-sm">
                    No. These NFTs are soulbound tokens, permanently locked to the wallet that minted them. This commemorative design ensures each NFT remains connected to its original recipient.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">What determines my NFT's rarity?</h3>
                  <p className="text-text-muted text-sm">
                    Your NFT's tier is deterministically selected from your unique hash using weighted probabilities. The algorithm uses KodaDot's standard hash-to-seed conversion, ensuring the same hash always produces the same tier.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Is the 3D visualization stored on-chain?</h3>
                  <p className="text-text-muted text-sm">
                    No. Only your hash is stored on-chain in the NFT metadata. The 3D visualization is generated in real-time by the viewer using your hash. This makes the NFT lightweight while maintaining uniqueness.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Will my NFT always be viewable?</h3>
                  <p className="text-text-muted text-sm">
                    Yes. The hash is stored permanently on Polkadot Asset Hub, and the viewer code is hosted on IPFS (decentralized storage). As long as you have the hash, you can regenerate the visualization.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Can I mint multiple NFTs?</h3>
                  <p className="text-text-muted text-sm">
                    No. This is an exclusive drop limited to one NFT per whitelisted email address.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Which wallets are supported?</h3>
                  <p className="text-text-muted text-sm">
                    Any Polkadot-compatible wallet that supports Asset Hub (Parachain 1000), including Polkadot.js extension, Talisman, SubWallet, Nova Wallet, and more.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Footer CTA */}
        <section>
          <Card glass className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4 text-gradient-pink-purple">
              Ready to Mint?
            </h2>
            <p className="text-lg text-text-muted mb-8">
              Join the celebration and claim your unique piece of Parity history.
            </p>
            <a
              href="/mint"
              className="inline-block px-8 py-3 bg-gradient-to-r from-parity-pink to-parity-purple rounded-full text-lg font-medium hover:opacity-90 transition-opacity"
            >
              Mint Your NFT
            </a>
          </Card>
        </section>
      </div>
    </main>
  );
}
