import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('handles undefined/null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('deduplicates tailwind classes', () => {
    const result = cn('p-4', 'p-6');
    expect(result).toBe('p-6');
  });
});
