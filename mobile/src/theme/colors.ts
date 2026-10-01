// 색의 단일 소스(§5-1). Figma(Weave Make 디자인) 토큰을 따른다. 밝은 테마만 쓴다.
// 원본 색이 글자로 쓰기엔 대비가 모자라면(§5.2-5) 글자용 변형(…Text)을 따로 둔다 — theme.test.ts가 검사.
export const colors = {
  ink: '#1c1d22',
  inkSoft: '#6b6f7a',
  /** 장식·비활성 전용 (대비 2.4:1 — 정보를 담은 글자에 쓰지 않는다) */
  inkFaint: '#a2a6b0',
  line: '#ecedf1',
  surface: '#ffffff',
  canvas: '#f7f7f9',

  /** 실 — 주요 동작·강조 (Figma thread) */
  thread: '#2b4c8c',
  threadSoft: '#ebf0f8',
  onThread: '#ffffff',

  /** 임박·과부하 — 막대·아이콘용 원본 */
  warn: '#e0632c',
  /** 임박·과부하 글자 (원본 #e0632c는 글자 대비 부족) */
  warnText: '#b84a1a',
  warnSoft: '#fbede6',

  /** 지연 — 막대·아이콘용 원본 */
  danger: '#d6455a',
  /** 지연 글자 (원본 #d6455a는 글자 대비 부족) */
  dangerText: '#c4384c',
  dangerSoft: '#fdecef',

  /** 체크박스·입력칸 경계 (Figma #d3d5dc는 대비 부족 → 3:1 이상으로) */
  control: '#8a8e99',
  /** 위젯 미리보기 뒤 바탕화면 느낌 (Figma 그라데이션의 중간색) */
  wallpaper: '#d6dcea',
  /** 하단 시트 뒤 어둡게 */
  scrim: 'rgba(28, 29, 34, 0.25)',
} as const;

export type ColorTokens = typeof colors;

/**
 * 프로젝트별 색 — 사용자가 고른다. 경고색(주황/빨강)과 겹치지 않는 톤만.
 * 앞 3개는 Figma PROJECTS, 뒤 4개는 사용자 요청(5가지 이상)으로 추가한 임시안(사용자 확인 필요).
 * Figma의 회색은 뺐다(사용자 결정 2026-10-01).
 */
export const projectPaletteMap = {
  teal: { dot: '#0d9488', soft: '#e4f6f3', text: '#0a7166', label: '청록' },
  magenta: { dot: '#b23a7a', soft: '#fbe8f2', text: '#97306a', label: '자홍' },
  violet: { dot: '#6a4fc4', soft: '#f0ecfc', text: '#5a3fb0', label: '보라' },
  blue: { dot: '#2f6fd0', soft: '#e8f0fc', text: '#2459a8', label: '파랑' },
  green: { dot: '#3a8a3f', soft: '#e8f4e8', text: '#2e6e32', label: '초록' },
  amber: { dot: '#b7791f', soft: '#fbf1dd', text: '#8a5a12', label: '황토' },
  brown: { dot: '#8d6344', soft: '#f4ece5', text: '#72503a', label: '갈색' },
} as const;

export type ProjectColorKey = keyof typeof projectPaletteMap;
export type ProjectPalette = (typeof projectPaletteMap)[ProjectColorKey];

export const projectPalettes: ProjectPalette[] = Object.values(projectPaletteMap);
export const projectColorOrder: ProjectColorKey[] = ['teal', 'magenta', 'violet', 'blue', 'green', 'amber', 'brown'];

export function projectPaletteFor(key: ProjectColorKey): ProjectPalette {
  return projectPaletteMap[key];
}
