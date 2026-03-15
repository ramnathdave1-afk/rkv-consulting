'use client';

import React, { type ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

function Tabs({ defaultValue, value, onValueChange, children, className }: {
  defaultValue?: string; value?: string; onValueChange?: (v: string) => void; children: ReactNode; className?: string;
}) {
  return <RadixTabs.Root defaultValue={defaultValue} value={value} onValueChange={onValueChange} className={cn('w-full', className)}>{children}</RadixTabs.Root>;
}

function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List className={cn('flex items-center gap-1 border-b border-border overflow-x-auto', className)}>
      {children}
    </RadixTabs.List>
  );
}

function TabsTrigger({ value, children, className, icon }: { value: string; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        'relative px-4 py-2.5 text-xs uppercase tracking-wider font-semibold text-text-muted whitespace-nowrap transition-colors',
        'hover:text-text-primary',
        'data-[state=active]:text-text-primary',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-transparent after:transition-colors',
        'data-[state=active]:after:bg-accent',
        'inline-flex items-center gap-2',
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </RadixTabs.Trigger>
  );
}

function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return <RadixTabs.Content value={value} className={cn('mt-4 outline-none', className)}>{children}</RadixTabs.Content>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
