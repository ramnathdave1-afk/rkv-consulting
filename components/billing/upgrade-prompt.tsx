'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';

interface Props {
  feature: string;
  description?: string;
  /** Optional override for the upgrade page URL. */
  href?: string;
  /** Render as a full-card overlay (default) or a compact inline banner. */
  variant?: 'card' | 'inline';
}

/**
 * Drop-in placeholder for any UI that's gated behind a feature flag.
 *
 * Usage:
 *   const { plan } = usePlan();
 *   if (!plan?.features.voice_ai) return <UpgradePrompt feature="Voice AI" />;
 */
export function UpgradePrompt({
  feature,
  description,
  href = '/settings/billing/upgrade',
  variant = 'card',
}: Props) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/40 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <Lock className="h-4 w-4" aria-hidden />
          <span>
            <strong>{feature}</strong> isn&rsquo;t included on your current plan.
          </span>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
        <Sparkles className="h-5 w-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
      </div>
      <div>
        <h3 className="text-base font-semibold">{feature} requires an upgrade</h3>
        {description ? (
          <p className="mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        ) : (
          <p className="mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            This feature isn&rsquo;t included on your current plan. Upgrade to unlock it.
          </p>
        )}
      </div>
      <Link
        href={href}
        className="mt-1 inline-flex items-center gap-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        See plans
      </Link>
    </div>
  );
}
