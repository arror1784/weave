import type { TextStyle } from 'react-native';

// 글꼴: 본문 Pretendard, 숫자·날짜·시간은 JetBrains Mono (Figma). Android는 굵기를 fontFamily로 고른다.
export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  black: 'Pretendard-Black',
  mono: 'JetBrainsMono-SemiBold',
  monoBold: 'JetBrainsMono-Bold',
} as const;

// 글자 크기는 기준값일 뿐 — 시스템 글자 크기 설정에 따라 커진다(§5.2-6). 고정 높이를 두지 않는다.
export const typography = {
  /** 로그인·스플래시 Weave */
  hero: { fontFamily: fonts.black, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  /** 탭 화면 제목 (오늘 날짜·전체 일정·프로젝트·설정) */
  title: { fontFamily: fonts.black, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  /** 프로젝트 상세 이름 */
  heading: { fontFamily: fonts.black, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  /** 하단 시트·과부하 제목 */
  sheetTitle: { fontFamily: fonts.black, fontSize: 18, lineHeight: 24 },
  /** 카드 제목 (프로젝트명 등) */
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  /** 상단 바 제목·섹션 제목 */
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  /** 작업 이름 등 기본 글자 */
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  /** 설명 문장 */
  bodyRegular: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  /** 입력칸 라벨·섹션 라벨 */
  fieldLabel: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
  /** D-day·시간·날짜 숫자 */
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16 },
  monoBold: { fontFamily: fonts.monoBold, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
