// 색의 단일 소스(§5-1). 밝은 테마만 쓴다. 값을 바꾸면 theme.test.ts가 명도 대비(§5.2-5)를 다시 검사한다.
export const colors = {
  /** 화면 바탕 — 차가운 흰색 */
  background: '#F5F6FA',
  /** 카드·입력칸 바탕 */
  surface: '#FFFFFF',
  /** 본문 글자 — 짙은 남색 잉크 */
  text: '#1C1F3B',
  textSecondary: '#5A607A',
  /** 옅은 구분선 (장식용) */
  border: '#E3E5EE',
  /** 입력칸·체크박스 테두리 (3:1 이상) */
  borderStrong: '#8A90A8',
  /** 코발트 블루 — 주요 동작·강조 */
  primary: '#2F4BDB',
  primarySoft: '#E8ECFD',
  onPrimary: '#FFFFFF',
  danger: '#C9362F',
  dangerSurface: '#FFF0EE',
  /** 경고 패널 안의 구분선 */
  dangerBorder: '#F6D5D1',
} as const;

export type ColorTokens = typeof colors;

/**
 * 프로젝트 "실" 색 — 여러 프로젝트가 섞인 목록에서 어느 프로젝트의 작업인지 구분한다.
 * 색만으로 구분하지 않고 항상 프로젝트 이름을 함께 보여준다(§5.2-4).
 */
export const threadColors = ['#3D63F0', '#0E8C7C', '#B8720F', '#E0508A', '#8057E0'] as const;

/**
 * 프로젝트의 실 색 — 등록 순서대로 배정해 프로젝트 5개까지는 모두 다른 색이 된다.
 * (사용자가 색을 직접 고르는 기능은 미정)
 */
export function threadColorFor(projectId: string, projects: readonly { id: string }[]): string {
  const index = projects.findIndex((p) => p.id === projectId);
  return threadColors[Math.max(index, 0) % threadColors.length];
}
