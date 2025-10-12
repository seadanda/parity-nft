import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-parity-pink mx-auto mb-4" />
        <p className="text-xl text-text-muted">Loading...</p>
      </div>
    </div>
  );
}
