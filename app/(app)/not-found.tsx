import { FileQuestion, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <FileQuestion size={24} className="text-accent" />
        </div>
        <h2 className="font-display text-lg font-bold text-text-primary mb-2">
          Page not found
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
