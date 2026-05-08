import { useEffect } from 'react';
import type { ThemeKey } from '@bingo/contracts';
import { themeTokens } from '@bingo/ui';

export function useThemeShell(theme: ThemeKey | undefined, highContrast: boolean) {
  useEffect(() => {
    if (!theme) {
      return;
    }

    const root = document.body;
    const tokens = themeTokens[theme];
    root.style.setProperty('--bg-color', tokens.background);
    root.style.setProperty('--surface', tokens.surface);
    root.style.setProperty('--surface-strong', tokens.background);
    root.style.setProperty('--accent', tokens.accent);
    root.style.setProperty('--text-color', tokens.text);
    root.style.setProperty('--glow-color', tokens.glow);
    root.dataset.contrast = highContrast ? 'high' : 'normal';
  }, [highContrast, theme]);
}
