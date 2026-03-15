'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, MapPin, Zap, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'site' | 'substation' | 'parcel';
  name: string;
  subtitle: string;
  score?: number;
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  }

  function handleSelect(result: SearchResult) {
    onOpenChange(false);
    if (result.type === 'site') {
      window.location.href = `/sites/${result.id}`;
    } else {
      window.location.href = `/map?focus=${result.id}`;
    }
  }

  const typeIcons = {
    site: Building2,
    substation: Zap,
    parcel: MapPin,
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-bg-secondary shadow-2xl focus:outline-none"
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Input */}
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    {loading ? (
                      <Loader2 size={16} className="text-accent animate-spin shrink-0" />
                    ) : (
                      <Search size={16} className="text-text-muted shrink-0" />
                    )}
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search sites, substations, or ask a question..."
                      className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                    />
                    <kbd className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                      ESC
                    </kbd>
                  </div>

                  {/* Results */}
                  <div className="max-h-80 overflow-y-auto p-2">
                    {results.length === 0 && query && !loading && (
                      <p className="px-3 py-6 text-center text-sm text-text-muted">
                        No results found
                      </p>
                    )}
                    {results.length === 0 && !query && (
                      <p className="px-3 py-6 text-center text-sm text-text-muted">
                        Try &quot;substations near Ashburn&quot; or &quot;sites &gt;100MW&quot;
                      </p>
                    )}
                    {results.map((result, i) => {
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                            i === selectedIndex
                              ? 'bg-accent/10 text-text-primary'
                              : 'text-text-secondary hover:bg-bg-elevated',
                          )}
                        >
                          <Icon size={16} className={i === selectedIndex ? 'text-accent' : 'text-text-muted'} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.name}</p>
                            <p className="text-xs text-text-muted truncate">{result.subtitle}</p>
                          </div>
                          {result.score !== undefined && (
                            <span className="text-xs font-mono text-accent">{result.score}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-text-muted">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>ESC Close</span>
                  </div>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
