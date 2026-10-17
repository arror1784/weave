import type { Project } from '@/api/types';

/**
 * 프로젝트 색 7가지 — 앱(mobile/src/theme/colors.ts의 projectPaletteMap)과 같은 값. 바꾸면 둘 다 고친다.
 * 색만으로 구분하지 않도록 항상 이름(label)을 함께 쓴다.
 */
export const projectPalette = {
  teal: { dot: '#0d9488', soft: '#e4f6f3', text: '#0a7166', label: '청록' },
  magenta: { dot: '#b23a7a', soft: '#fbe8f2', text: '#97306a', label: '자홍' },
  violet: { dot: '#6a4fc4', soft: '#f0ecfc', text: '#5a3fb0', label: '보라' },
  blue: { dot: '#2f6fd0', soft: '#e8f0fc', text: '#2459a8', label: '파랑' },
  green: { dot: '#3a8a3f', soft: '#e8f4e8', text: '#2e6e32', label: '초록' },
  amber: { dot: '#b7791f', soft: '#fbf1dd', text: '#8a5a12', label: '황토' },
  brown: { dot: '#8d6344', soft: '#f4ece5', text: '#72503a', label: '갈색' },
} as const satisfies Record<Project['color'], { dot: string; soft: string; text: string; label: string }>;

export const projectColorOrder: Project['color'][] = ['teal', 'magenta', 'violet', 'blue', 'green', 'amber', 'brown'];
