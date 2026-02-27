'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure the recovery session is established if Supabase sent tokens in the URL.
    // supabase-js handles this automatically in most cases; we keep this effect to
    // avoid a confusing blank state after redirect.
    supabase.auth.getSession().catch(() => null);
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    toast.success('Password updated.');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-border rounded-lg p-8">
        <h1 className="font-display font-bold text-3xl text-white">Set a new password</h1>
        <p className="mt-2 text-muted font-body">
          Choose a strong password to secure your account.
        </p>

        {error && (
          <div className="mt-6 p-3 rounded-lg bg-[#DC262610] border border-[#DC262640]">
            <p className="text-[13px] text-red font-body">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="New password"
            type={show ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            rightAdornment={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="w-8 h-8 rounded-[6px] border border-border text-muted hover:text-white hover:border-border-hover transition-colors inline-flex items-center justify-center"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Input
            label="Confirm password"
            type={show ? 'text' : 'password'}
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth loading={loading}>
            Update password
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

