import type { TextStyle } from 'react-native';

// 글꼴은 Pretendard(OFL, assets/fonts). Android는 굵기를 fontWeight가 아니라 글꼴 파일로 고른다.
export const fonts = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

// 글자 크기는 기준값일 뿐 — 시스템 글자 크기 설정에 따라 커진다(§5.2-6). 고정 높이를 두지 않는다.
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
