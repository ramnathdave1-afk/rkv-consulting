'use client';

import React, { type ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Tabs root                                                          */
/* ------------------------------------------------------------------ */

function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      {children}
    </RadixTabs.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsList (the tab bar)                                             */
/* ------------------------------------------------------------------ */

function TabsList({ children, className }: TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        'flex items-center gap-1 bg-transparent',
        'border-b border-border',
        'overflow-x-auto scrollbar-none',
        className,
      )}
    >
      {children}
    </RadixTabs.List>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsTrigger (individual tab)                                       */
/* ------------------------------------------------------------------ */

function TabsTrigger({
  value,
  children,
  className,
  disabled,
  icon,
}: TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      value={value}
      disabled={disabled}
      className={cn(
        'relative px-4 py-2.5 font-body text-[11px] uppercase tracking-[0.08em] font-semibold',
        'text-muted whitespace-nowrap',
        'transition-colors duration-150 ease-out',
        'hover:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,168,76,0.20)] focus-visible:ring-inset',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        // Active state
        'data-[state=active]:text-white',
        // Green bottom border indicator
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px]',
        'after:bg-transparent after:transition-colors after:duration-200',
        'data-[state=active]:after:bg-gold',
        // Flex for icon
        'inline-flex items-center gap-2',
        className,
      )}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      {children}
    </RadixTabs.Trigger>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsContent (panel)                                                */
/* ------------------------------------------------------------------ */

function TabsContent({ value, children, className }: TabsContentProps) {
  return (
    <RadixTabs.Content
      value={value}
      className={cn(
        'mt-4 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[rgba(201,168,76,0.20)] rounded-lg',
        // Entrance animation
        'data-[state=active]:animate-fade-up',
        className,
      )}
    >
      {children}
    </RadixTabs.Content>
  );
}

/* ------------------------------------------------------------------ */
/*  Display names                                                      */
/* ------------------------------------------------------------------ */

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
