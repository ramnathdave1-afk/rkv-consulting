/**
 * RKV Animation System — iOS (React Native).
 * Mirrors web: lib/motion.ts (Bloomberg/Palantir style, purposeful, no decoration).
 * Respects system reduced-motion (Accessibility).
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// ─── Easing (match web: [0.16, 1, 0.3, 1] = fast start, smooth land) ─────
export const easing = {
  entrance: Easing.bezier(0.16, 1, 0.3, 1),
  micro: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

export const duration = {
  entrance: 450,
  entranceSlow: 550,
  hover: 180,
  stagger: 60,
  staggerFast: 40,
  pageOut: 200,
  pageIn: 400,
} as const;

/** Reduced motion: instant */
export const durationReduced = 10;

/** Variant presets (values for withTiming; use in useAnimatedStyle) */
export const variantEntranceFromBelow = {
  hidden: { opacity: 0, translateY: 24 },
  visible: { opacity: 1, translateY: 0 },
} as const;

export const variantEntranceFromBelowSmall = {
  hidden: { opacity: 0, translateY: 12 },
  visible: { opacity: 1, translateY: 0 },
} as const;

export const variantScaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
} as const;

export const variantReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const;

/** Hook: true when user prefers reduced motion */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** Get transition config for Reanimated withTiming */
export function getTransition(reduced: boolean) {
  return {
    duration: reduced ? durationReduced : duration.entrance,
    easing: reduced ? Easing.out(Easing.ease) : easing.entrance,
  };
}

/** Hook: animate entrance from below (like web variantEntranceFromBelow) */
export function useEntranceFromBelow(reduced: boolean, delayMs = 0) {
  const opacity = useSharedValue(reduced ? 1 : variantEntranceFromBelow.hidden.opacity);
  const translateY = useSharedValue(reduced ? 0 : variantEntranceFromBelow.hidden.translateY);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    const t = setTimeout(() => {
      opacity.value = withTiming(variantEntranceFromBelow.visible.opacity, {
        duration: duration.entrance,
        easing: easing.entrance,
      });
      translateY.value = withTiming(variantEntranceFromBelow.visible.translateY, {
        duration: duration.entrance,
        easing: easing.entrance,
      });
    }, delayMs);
    return () => clearTimeout(t);
  }, [reduced, delayMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

/** Stagger delay for list items (same as web: 60ms) */
export const staggerDelay = duration.stagger;
