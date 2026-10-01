import { parseBold, stripBold } from './markdown';

describe('parseBold', () => {
  it('**로 감싼 부분을 굵은 조각으로 나눈다', () => {
    expect(parseBold('1. **마감 기한**은 언제인가요?')).toEqual([
      { text: '1. ', bold: false },
      { text: '마감 기한', bold: true },
      { text: '은 언제인가요?', bold: false },
    ]);
  });

  it('굵은 부분이 줄 안에 여러 개여도 나눈다', () => {
    expect(parseBold('**가**와 **나**')).toEqual([
      { text: '가', bold: true },
      { text: '와 ', bold: false },
      { text: '나', bold: true },
    ]);
  });

  it('짝이 없는 **는 글자 그대로 둔다', () => {
    expect(parseBold('2 ** 3 = 8')).toEqual([{ text: '2 ** 3 = 8', bold: false }]);
  });

  it('굵은 부분이 줄을 넘지 않는다', () => {
    expect(parseBold('**가\n나**')).toEqual([{ text: '**가\n나**', bold: false }]);
  });
});

describe('stripBold', () => {
  it('스크린리더용으로 ** 기호만 뺀다', () => {
    expect(stripBold('1. **마감 기한**은 언제인가요?')).toBe('1. 마감 기한은 언제인가요?');
  });
});
