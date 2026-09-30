import { withParticle } from './korean';

describe('withParticle (이/가)', () => {
  it('받침이 있으면 이, 없으면 가를 붙인다', () => {
    expect(withParticle('설계 문서 작성', '이', '가')).toBe('설계 문서 작성이');
    expect(withParticle('발표자료', '이', '가')).toBe('발표자료가');
  });

  it('은/는, 을/를에도 쓴다', () => {
    expect(withParticle('임베디드시스템 과제', '이', '가')).toBe('임베디드시스템 과제가');
    expect(withParticle('창업동아리', '을', '를')).toBe('창업동아리를');
  });

  it('한글이 아닌 글자로 끝나면 둘 다 표시한다', () => {
    expect(withParticle('Report v2', '이', '가')).toBe('Report v2이(가)');
  });
});
