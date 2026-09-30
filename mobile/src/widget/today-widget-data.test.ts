import { createSeed } from '@/mocks/seed';
import type { State } from '@/mocks/types';

import { buildTodayWidgetData } from './today-widget-data';

const TODAY = '2026-09-30';
const state = (): State => ({ session: null, draft: null, ...createSeed(TODAY) });

describe('오늘의 일정 위젯 데이터', () => {
  it('날짜, 밀린 작업 수, 아직 안 한 오늘 작업을 보여준다', () => {
    const data = buildTodayWidgetData(state(), TODAY);
    expect(data.dateLabel).toBe('9월 30일 수요일');
    expect(data.overdueCount).toBe(1);
    // '3차시 스터디 진행'은 완료라 빠진다
    expect(data.tasks).toEqual(['동아리 프로젝트 기획 자료조사', '동아리방 청소']);
    expect(data.moreCount).toBe(0);
  });

  it('오늘 작업이 3개를 넘으면 3개만 보여주고 나머지는 개수로 알린다', () => {
    const s = state();
    s.tasks = [1, 2, 3, 4, 5].map((n) => ({ id: `t${n}`, projectId: 'p', title: `작업 ${n}`, estimatedHours: null, dependsOn: [], scheduledDate: TODAY, done: false }));
    const data = buildTodayWidgetData(s, TODAY);
    expect(data.tasks).toEqual(['작업 1', '작업 2', '작업 3']);
    expect(data.moreCount).toBe(2);
  });

  it('스크린리더용 요약 문장을 만든다', () => {
    expect(buildTodayWidgetData(state(), TODAY).accessibilityLabel).toBe('9월 30일 수요일 오늘의 일정. 밀린 작업 1건. 오늘 할 일 2건: 동아리 프로젝트 기획 자료조사, 동아리방 청소');
  });
});
