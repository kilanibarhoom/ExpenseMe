import { useColorScheme } from 'react-native';

import { useSettings } from './settings-store';

export const palettes = {
  light: {
    bg: '#F6F7F9',
    card: '#FFFFFF',
    text: '#111318',
    textMuted: '#8A8F98',
    separator: '#ECEDEF',
    green: '#22A06B',
    greenSoft: '#E6F6EF',
    red: '#E5484D',
    redSoft: '#FDEBEC',
    amber: '#F5A623',
    blue: '#3B82F6',
    chip: '#EDEEF1',
    chipActive: '#111318',
    chipActiveText: '#FFFFFF',
    glassFallback: 'rgba(255,255,255,0.92)',
  },
  dark: {
    bg: '#0F1115',
    card: '#1A1D23',
    text: '#F2F3F5',
    textMuted: '#9BA1AB',
    separator: '#262A31',
    green: '#3DD68C',
    greenSoft: '#12281E',
    red: '#F2555A',
    redSoft: '#2C1516',
    amber: '#F5A623',
    blue: '#5A9CF8',
    chip: '#23262D',
    chipActive: '#F2F3F5',
    chipActiveText: '#0F1115',
    glassFallback: 'rgba(26,29,35,0.92)',
  },
} as const;

export type ThemeColors = Record<keyof (typeof palettes)['light'], string>;

export const radii = { card: 22, control: 14, pill: 32 } as const;
export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export function useResolvedScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}

export function useThemeColors(): ThemeColors {
  return palettes[useResolvedScheme()];
}

/**
 * Text colors matching iOS's system label colors, driven by the device's
 * actual current appearance — not the app's own theme override. Native
 * chrome (Liquid Glass sheets, in particular) always follows the real
 * system setting regardless of what the in-app theme toggle is set to, so
 * content sitting directly on that glass must track the same source or the
 * two can end up mismatched (e.g. dark text over dark glass).
 */
export function useNativeSheetColors(): { text: string; textMuted: string } {
  const system = useColorScheme();
  return system === 'dark'
    ? { text: '#FFFFFF', textMuted: 'rgba(235,235,245,0.6)' }
    : { text: '#000000', textMuted: 'rgba(60,60,67,0.6)' };
}
