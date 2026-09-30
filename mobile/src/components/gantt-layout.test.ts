import { barSpan } from './gantt-layout';

const range = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'];

describe('barSpan (간트 막대 위치, 칸 단위)', () => {
  it('범위 안의 작업은 시작 칸과 길이를 그대로 쓴다', () => {
    expect(barSpan('2026-09-30', 2, range)).toEqual({ start: 2, length: 2 });
  });

  it('범위보다 먼저 시작한 작업은 첫 칸부터 보이는 만큼만 그린다', () => {
    expect(barSpan('2026-09-27', 2, range)).toEqual({ start: 0, length: 1 });
  });

  it('범위 끝을 넘는 작업은 끝에서 자른다', () => {
    expect(barSpan('2026-10-05', 3, range)).toEqual({ start: 7, length: 2 });
  });

  it('범위 밖에만 있는 작업은 그리지 않는다', () => {
    expect(barSpan('2026-09-20', 2, range)).toBeNull();
    expect(barSpan('2026-10-10', 1, range)).toBeNull();
  });
});
