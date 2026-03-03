/**
 * RKV Animation System — Bloomberg/Palantir style.
 * Every animation serves a purpose. No decoration. Calculated and precise.
 * Respects prefers-reduced-motion.
 */

import { useState, useEffect } from 'react';

export const easing = {
  /** Entrances: fast start, smooth land */
  entrance: [0.16, 1, 0.3, 1] as const,
  /** Micro-interactions (hover, tap) */
  micro: [0.4, 0, 0.2, 1] as const,
} as const;

export const duration = {
  entrance: 0.45,
  entranceSlow: 0.55,
  hover: 0.18,
  dataTransition: 0.35,
  stagger: 0.06,
  staggerFast: 0.04,
  pageOut: 0.2,
  pageIn: 0.4,
} as const;

/** Stagger delay between list items (50–80ms) */
export const staggerDelay = 0.06;

/** Framer Motion transition for entrances */
export const transitionEntrance = {
  type: 'tween' as const,
  duration: duration.entrance,
  ease: easing.entrance,
};

/** Framer Motion transition for micro */
export const transitionMicro = {
  type: 'tween' as const,
  duration: duration.hover,
  ease: easing.micro,
};

/** Default entrance from below (translateY 20–30px, opacity 0→1) */
export const variantEntranceFromBelow = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const variantEntranceFromBelowSmall = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/** For status pill scale (0.95 → 1) */
export const variantScaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

/** Reduced motion: no transform, minimal duration */
export const variantReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const transitionReduced = {
  duration: 0.01,
  ease: 'easeOut' as const,
};

/** Check if user prefers reduced motion (sync) */
export function getReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Hook: use in components to respect reduced motion in variants */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (!mq) return;
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}
