import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold text-text-primary mb-3">404</h1>
        <p className="text-sm text-text-secondary mb-6">
          This page could not be found.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
