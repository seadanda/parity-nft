import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="glass border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center">
          <a
            href="https://github.com/seadanda/parity-nft"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-parity-pink focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
            aria-label="View source code on GitHub"
          >
            <Github className="h-5 w-5" />
            <span>Code</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
