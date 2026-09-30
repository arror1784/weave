import { contrastRatio } from '@/lib/contrast';

import { threadColorFor, threadColors } from './colors';
import { getTheme } from './index';

// 앱은 밝은 테마만 쓴다(다크 모드 미지원 — 루트 CLAUDE.md §1).
const { colors } = getTheme();

describe('명도 대비 (§5.2-5)', () => {
  it('본문·보조 글자는 배경과 카드 위에서 4.5:1 이상이다', () => {
    for (const bg of [colors.background, colors.surface]) {
      expect(contrastRatio(colors.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('주 버튼 글자(onPrimary)는 주 버튼 배경 대비 4.5:1 이상이다', () => {
    expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('강조 글자(primary)는 배경·카드 대비 4.5:1 이상이다', () => {
    expect(contrastRatio(colors.primary, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.primary, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('경고 글자(danger)는 경고 배경·카드 대비 4.5:1 이상이다', () => {
    expect(contrastRatio(colors.danger, colors.dangerSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.danger, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('입력칸·체크박스 테두리는 카드 대비 3:1 이상이다', () => {
    expect(contrastRatio(colors.borderStrong, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it('프로젝트 실 색은 모두 카드 대비 3:1 이상이다 (그래픽 요소 기준)', () => {
    for (const color of threadColors) {
      expect(contrastRatio(color, colors.surface)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('threadColorFor', () => {
  // 실제 목업 프로젝트 ID — ID 해시로 색을 정하면 p-club과 p-clubroom이 같은 색이 됐다
  const projects = ['p-hackathon', 'p-study', 'p-club', 'p-clubroom', 'p-embedded', 'p-sixth'].map((id) => ({ id }));

  it('등록 순서대로 색을 배정해 프로젝트 5개까지는 모두 다른 색이다', () => {
    const firstFive = projects.slice(0, 5).map((p) => threadColorFor(p.id, projects));
    expect(new Set(firstFive).size).toBe(5);
  });

  it('6번째 프로젝트부터는 색을 처음부터 다시 쓴다', () => {
    expect(threadColorFor('p-sixth', projects)).toBe(threadColorFor('p-hackathon', projects));
  });

  it('목록에 없는 프로젝트에도 실 색 목록 안의 색을 준다', () => {
    expect(threadColors).toContain(threadColorFor('unknown', projects));
  });
});
