import type { ThemeKey, ThemeTokenSet } from '@bingo/contracts';

export const themeTokens: Record<ThemeKey, ThemeTokenSet> = {
  cassino: {
    background: '#07131d',
    surface: 'rgba(12, 31, 43, 0.78)',
    accent: '#ff7a59',
    text: '#f7f1e7',
    glow: 'rgba(65, 255, 209, 0.25)',
  },
  natal: {
    background: '#0a2018',
    surface: 'rgba(16, 49, 32, 0.82)',
    accent: '#f05454',
    text: '#fff6ec',
    glow: 'rgba(255, 220, 109, 0.22)',
  },
  neon: {
    background: '#050816',
    surface: 'rgba(18, 12, 49, 0.78)',
    accent: '#4bf6ff',
    text: '#f7f0ff',
    glow: 'rgba(137, 92, 255, 0.26)',
  },
  junina: {
    background: '#1a1021',
    surface: 'rgba(59, 19, 57, 0.8)',
    accent: '#ffb449',
    text: '#fff8ef',
    glow: 'rgba(255, 159, 67, 0.22)',
  },
  infantil: {
    background: '#13213d',
    surface: 'rgba(19, 33, 61, 0.78)',
    accent: '#ff6fa3',
    text: '#fffdf7',
    glow: 'rgba(121, 255, 214, 0.25)',
  },
};
