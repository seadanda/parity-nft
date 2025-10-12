import Image from 'next/image';

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
          <div className="flex gap-4 justify-center">
            <a
              href="/mint"
              className="px-8 py-4 bg-gradient-to-r from-parity-pink to-parity-purple rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Mint Your NFT
            </a>
            <a
              href="#tiers"
              className="px-8 py-4 glass rounded-full font-medium hover:bg-white/10 transition-colors"
            >
              View Tiers
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
