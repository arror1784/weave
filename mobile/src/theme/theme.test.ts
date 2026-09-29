import { contrastRatio } from '@/lib/contrast';

import { getTheme } from './index';

describe('getTheme', () => {
  it('다크 모드면 다크 토큰을 돌려준다', () => {
    expect(getTheme('dark').scheme).toBe('dark');
  });

  it('시스템 설정을 알 수 없으면 라이트 토큰을 돌려준다', () => {
    expect(getTheme('unspecified').scheme).toBe('light');
    expect(getTheme(undefined).scheme).toBe('light');
  });

  describe.each(['light', 'dark'] as const)('%s 모드 명도 대비 (§5.2-5)', (scheme) => {
    const { colors } = getTheme(scheme);

    it('본문 글자는 배경 대비 4.5:1 이상이다', () => {
      expect(contrastRatio(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
    });

    it('보조 글자도 배경 대비 4.5:1 이상이다', () => {
      expect(contrastRatio(colors.textSecondary, colors.background)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
