'use client';

import React, { type ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

function Tooltip({ content, children, side = 'top', className }: {
  content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; className?: string;
}) {
  if (!content) return <>{children}</>;

  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[100] px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-xs select-none',
            'animate-in fade-in-0 zoom-in-95',
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-border" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

Tooltip.displayName = 'Tooltip';
export { Tooltip };
export default Tooltip;
