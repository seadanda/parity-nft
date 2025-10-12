'use client';

import { useState } from 'react';
import { Button, Input, Card } from '@/components/ui';
import { Mail, KeyRound } from 'lucide-react';

interface EmailVerificationProps {
  onVerified: (email: string, sessionToken: string) => void;
}

type Step = 'email' | 'code' | 'verified';

export default function EmailVerification({ onVerified }: EmailVerificationProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send code');
      }

      setMessage(data.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: code.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid code');
      }

      setStep('verified');
      onVerified(data.email, data.sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setCode('');
    setError(null);
    setMessage(null);
    handleRequestCode(new Event('submit') as any);
  };

  if (step === 'email') {
    return (
      <Card glass>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
            <p className="text-text-muted">
              Enter your email to receive a verification code.
            </p>
          </div>

          <form onSubmit={handleRequestCode} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="your@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            {message && (
              <div className="p-4 rounded-xl bg-parity-pink/10 border border-parity-pink/20 text-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>
          </form>
        </div>
      </Card>
    );
  }

  if (step === 'code') {
    return (
      <Card glass>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Enter Verification Code</h2>
            <p className="text-text-muted">
              Check your email for a 6-digit code. It expires in 10 minutes.
            </p>
            <p className="text-sm text-text-muted mt-2">
              Sent to: <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              label="Verification Code"
              type="text"
              placeholder="123456"
              icon={<KeyRound className="w-5 h-5" />}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
              maxLength={6}
              pattern="[0-9]{6}"
            />

            {error && (
              <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleResend}
                disabled={isLoading}
                className="flex-1"
              >
                Resend Code
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="flex-1"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-sm text-text-muted hover:text-foreground transition-colors"
            >
              ← Change email
            </button>
          </form>
        </div>
      </Card>
    );
  }

  return null;
}
