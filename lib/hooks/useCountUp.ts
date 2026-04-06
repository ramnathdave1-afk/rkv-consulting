'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Animated counter hook with easeOutQuart easing.
 * Counts from 0 to the target value over the specified duration.
 */
export function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const startTime = useRef<number | null>(null);
  const prevTarget = useRef(target);

  const animateTo = useCallback(
    (from: number, to: number, dur: number) => {
      startTime.current = null;
      if (raf.current) cancelAnimationFrame(raf.current);

      const step = (timestamp: number) => {
        if (startTime.current === null) startTime.current = timestamp;
        const elapsed = timestamp - startTime.current;
        const progress = Math.min(elapsed / dur, 1);
        // easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(from + (to - from) * eased);
        if (progress < 1) {
          raf.current = requestAnimationFrame(step);
        } else {
          setValue(to);
        }
      };
      raf.current = requestAnimationFrame(step);
    },
    [],
  );

  useEffect(() => {
    animateTo(prevTarget.current !== target ? prevTarget.current : 0, target, duration);
    prevTarget.current = target;
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, animateTo]);

  return value;
}
