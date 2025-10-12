import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/parity-10-years-logo.png"
              alt="Parity 10 Years"
              width={120}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm text-text-muted hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/mint"
              className="px-6 py-2 bg-gradient-to-r from-parity-pink to-parity-purple rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Mint NFT
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
