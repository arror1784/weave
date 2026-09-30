import { addDays, dDayLabel, diffInDays, formatDateLabel, toDateKey } from './date';

describe('date', () => {
  it('Date를 로컬 기준 YYYY-MM-DD 키로 바꾼다', () => {
    expect(toDateKey(new Date(2026, 8, 18))).toBe('2026-09-18');
  });

  it('날짜 키에 일수를 더한다 (월 경계 포함)', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-09-30', -5)).toBe('2026-09-25');
  });

  it('두 날짜 사이의 일수를 계산한다', () => {
    expect(diffInDays('2026-09-25', '2026-09-30')).toBe(5);
    expect(diffInDays('2026-10-07', '2026-09-30')).toBe(-7);
  });

  it('남은 날은 D-n, 당일은 D-Day, 지난 날은 D+n으로 표시한다', () => {
    expect(dDayLabel('2026-10-07', '2026-09-30')).toBe('D-7');
    expect(dDayLabel('2026-09-30', '2026-09-30')).toBe('D-Day');
    expect(dDayLabel('2026-09-25', '2026-09-30')).toBe('D+5');
  });

  it('날짜를 "9월 18일 금요일" 형식으로 표시한다', () => {
    expect(formatDateLabel('2026-09-18')).toBe('9월 18일 금요일');
  });
});
