import { useColorScheme, type ColorSchemeName } from 'react-native';

import { palette, type ColorTokens } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
  spacing: typeof spacing;
  typography: typeof typography;
};

export function getTheme(scheme: ColorSchemeName | undefined): Theme {
  const resolved = scheme === 'dark' ? 'dark' : 'light';
  return { scheme: resolved, colors: palette[resolved], spacing, typography };
}

/** 라이트/다크는 시스템 설정을 따르고 토큰 세트만 바꾼다(§5.2-14). */
export function useAppTheme(): Theme {
  return getTheme(useColorScheme());
}

export { spacing, typography };
