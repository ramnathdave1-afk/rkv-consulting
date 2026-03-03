/**
 * RKV Design System — matches web globals.css (Bloomberg/ATLAS style).
 * Dark backgrounds, cool blue accent, precise contrast.
 */
export const colors = {
  bgPrimary: '#0A0A0F',
  bgSecondary: '#111118',
  bgTertiary: '#16161E',
  card: '#12121A',
  cardHover: '#1A1A24',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.12)',
  accent: '#00B4D8',
  accentHover: '#0096C7',
  accentMuted: '#48CAE4',
  red: '#C1121F',
  green: '#52B788',
  textPrimary: 'rgba(255,255,255,0.9)',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
} as const;

export type ThemeColors = typeof colors;
