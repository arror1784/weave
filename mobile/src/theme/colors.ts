// 색의 단일 소스(§5-1). 값을 바꾸면 theme.test.ts가 명도 대비(§5.2-5)를 다시 검사한다.
export const palette = {
  light: {
    text: '#11181C',
    textSecondary: '#60646C',
    background: '#FFFFFF',
    surface: '#F0F0F3',
    border: '#D9D9E0',
    primary: '#1D6FD8',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#B0B4BA',
    background: '#111113',
    surface: '#212225',
    border: '#363A3F',
    primary: '#6BA8F5',
  },
} as const;

export type ColorTokens = { [K in keyof typeof palette.light]: string };
