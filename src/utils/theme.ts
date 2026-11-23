import { AppearanceSettings } from '../types.js';

const APPEARANCE_STORAGE_KEY = 'nuh_appearance_settings_v1';

const FALLBACK_APPEARANCE: AppearanceSettings = {
  theme: 'light',
  fontSize: 'medium',
  compactMode: false
};

export function sanitizeAppearanceSettings(
  raw?: Partial<AppearanceSettings> | null
): AppearanceSettings {
  const theme =
    raw?.theme === 'dark' || raw?.theme === 'system' || raw?.theme === 'light'
      ? raw.theme
      : FALLBACK_APPEARANCE.theme;
  const fontSize =
    raw?.fontSize === 'small' || raw?.fontSize === 'large' || raw?.fontSize === 'medium'
      ? raw.fontSize
      : FALLBACK_APPEARANCE.fontSize;
  return {
    theme,
    fontSize,
    compactMode: Boolean(raw?.compactMode)
  };
}

export function getStoredAppearanceSettings(): AppearanceSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeAppearanceSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function applyAppearanceSettings(settings?: Partial<AppearanceSettings> | null): AppearanceSettings {
  const clean = sanitizeAppearanceSettings(settings);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage errors in private browsing mode
    }
  }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = clean.theme === 'dark' || (clean.theme === 'system' && prefersDark);

    root.classList.toggle('dark', shouldUseDark);
    root.classList.remove('font-scale-small', 'font-scale-medium', 'font-scale-large');
    root.classList.add(`font-scale-${clean.fontSize}`);
    root.classList.toggle('compact-layout', clean.compactMode);
  }

  return clean;
}

export function bootstrapAppearanceFromStorage(): AppearanceSettings {
  const stored = getStoredAppearanceSettings();
  return applyAppearanceSettings(stored || FALLBACK_APPEARANCE);
}
