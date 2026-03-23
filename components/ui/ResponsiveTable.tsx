'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronsRight } from 'lucide-react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  minWidth?: string;
}

export function ResponsiveTable({ children, minWidth = '700px' }: ResponsiveTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      setCanScroll(hasOverflow);
      setScrolledToEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };

    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);

    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [children]);

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto" style={{ minWidth: 0 }}>
        <div style={{ minWidth }}>
          {children}
        </div>
      </div>

      {/* Scroll indicator - visible only when content overflows and not scrolled to end */}
      {canScroll && !scrolledToEnd && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-bg-secondary/80 to-transparent flex items-center justify-end pr-1 sm:hidden">
          <ChevronsRight size={14} className="text-text-muted animate-pulse" />
        </div>
      )}
    </div>
  );
}
