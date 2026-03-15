'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
