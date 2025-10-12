import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui';

export default function Home() {
  return (
    <main className="min-h-screen pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-12">
          {/* Hero Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/parity-10-years-logo.png"
              alt="Parity 10 Years"
              width={400}
              height={133}
              priority
              className="w-auto h-32 sm:h-40 lg:h-48"
            />
          </div>

          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Celebrate a decade of innovation with unique 3D glass logo NFTs on Polkadot
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/mint">
              <Button variant="primary" size="lg">
                Mint Your NFT
              </Button>
            </Link>
            <Button variant="secondary" size="lg" onClick={() => {
              document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              View Tiers
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
