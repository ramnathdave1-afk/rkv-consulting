'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-muted">
          <AlertTriangle size={24} className="text-danger" />
        </div>
        <h2 className="font-display text-lg font-bold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-text-secondary mb-1">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        {error.digest && (
          <p className="text-xs text-text-muted mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
