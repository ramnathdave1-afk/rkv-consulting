'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success('Password reset email sent.');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-border rounded-lg p-8">
        <h1 className="font-display font-bold text-3xl text-white">Reset your password</h1>
        <p className="mt-2 text-muted font-body">
          Enter your email and we’ll send you a secure reset link.
        </p>

        {error && (
          <div className="mt-6 p-3 rounded-lg bg-[#DC262610] border border-[#DC262640]">
            <p className="text-[13px] text-red font-body">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Button type="submit" fullWidth loading={loading}>
            Send reset link
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/login" className="text-[13px] font-body text-gold hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

