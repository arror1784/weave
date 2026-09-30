import { contrastRatio } from '@/lib/contrast';

import { colors, projectPalettes, projectPaletteFor } from './colors';

// Figma(Weave Make 디자인) 토큰 기준. 대비가 모자란 색은 글자용 변형(…Text)을 따로 둔다 — §5.2-5.
describe('명도 대비 (§5.2-5)', () => {
  it('본문·보조 글자는 흰 카드와 캔버스 위에서 4.5:1 이상이다', () => {
    for (const bg of [colors.surface, colors.canvas]) {
      expect(contrastRatio(colors.ink, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.inkSoft, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('실(주요) 색은 흰 바탕·옅은 실 바탕 위에서 4.5:1 이상이고, 그 위 흰 글자도 4.5:1 이상이다', () => {
    expect(contrastRatio(colors.thread, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.thread, colors.threadSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.onThread, colors.thread)).toBeGreaterThanOrEqual(4.5);
  });

  it('임박(warn)·지연(danger) 글자는 흰 바탕과 각자의 옅은 바탕 위에서 4.5:1 이상이다', () => {
    expect(contrastRatio(colors.warnText, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.warnText, colors.warnSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.dangerText, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.dangerText, colors.dangerSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('임박·지연 막대·아이콘(그래픽)은 흰 바탕 대비 3:1 이상이다', () => {
    expect(contrastRatio(colors.warn, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colors.danger, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it('체크박스·입력칸 경계는 흰 바탕 대비 3:1 이상이다', () => {
    expect(contrastRatio(colors.control, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it('프로젝트 색: 점·막대는 흰 바탕 대비 3:1, 배지 글자는 배지 바탕·흰 바탕 대비 4.5:1 이상이다', () => {
    for (const p of projectPalettes) {
      expect(contrastRatio(p.dot, colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(p.text, p.soft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.text, colors.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('projectPaletteFor', () => {
  it('프로젝트에 지정된 색 키로 팔레트를 고른다', () => {
    expect(projectPaletteFor('magenta').dot).toBe('#b23a7a');
  });
});
