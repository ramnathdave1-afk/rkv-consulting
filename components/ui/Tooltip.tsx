'use client';

import React, { type ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TooltipProps {
  /** Text or ReactNode content to display in the tooltip */
  content: ReactNode;
  children: ReactNode;
  /** Which side to prefer */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment */
  align?: 'start' | 'center' | 'end';
  /** Delay in ms before showing */
  delayDuration?: number;
  /** Additional class names for the content */
  className?: string;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Provider - wrap your app once                                      */
/* ------------------------------------------------------------------ */

function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={0}>
      {children}
    </RadixTooltip.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  className,
  disabled = false,
}: TooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[100] px-3 py-1.5 rounded-lg',
            'font-body text-[11px]',
            'select-none',
            // Animation
            'data-[state=delayed-open]:animate-in',
            'data-[state=delayed-open]:fade-in-0',
            'data-[state=delayed-open]:zoom-in-95',
            'data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0',
            'data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-1',
            'data-[side=left]:slide-in-from-right-1',
            'data-[side=right]:slide-in-from-left-1',
            'data-[side=top]:slide-in-from-bottom-1',
            className,
          )}
          style={{
            background: '#111111',
            border: '1px solid #1e1e1e',
            color: '#f5f5f5',
          }}
        >
          {content}
          <RadixTooltip.Arrow
            width={10}
            height={5}
            style={{ fill: '#1e1e1e' }}
          />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Display names                                                      */
/* ------------------------------------------------------------------ */

TooltipProvider.displayName = 'TooltipProvider';
Tooltip.displayName = 'Tooltip';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Tooltip, TooltipProvider };
export default Tooltip;
