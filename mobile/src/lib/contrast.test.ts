import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('검정과 흰색의 대비는 21:1이다', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('같은 색의 대비는 1:1이다', () => {
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('인자 순서와 상관없이 같은 값을 돌려준다', () => {
    expect(contrastRatio('#60646C', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#60646C'), 5);
  });
});
