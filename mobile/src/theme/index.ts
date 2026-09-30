import { colors, type ColorTokens } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export type Theme = {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

const theme: Theme = { colors, spacing, radius, typography };

/** 밝은 테마만 쓴다 — 다크 모드는 지원하지 않는다(루트 CLAUDE.md §1). */
export function getTheme(): Theme {
  return theme;
}

export function useAppTheme(): Theme {
  return theme;
}

export { colors, radius, spacing, typography };
