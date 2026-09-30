export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  /** 화면 좌우 여백 (Figma px-5) */
  gutter: 20,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  /** 입력칸·작은 버튼 (rounded-xl) */
  control: 12,
  /** 카드·주 버튼 (rounded-2xl) */
  card: 16,
  /** 하단 시트 (rounded-t-3xl) */
  sheet: 24,
  pill: 999,
} as const;
