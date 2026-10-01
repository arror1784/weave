import type { Schedule } from '@/api/types';
import { sampleSchedule } from '@/test-utils/fixtures';

import { buildTodayWidgetData, buildUnavailableWidgetData } from './today-widget-data';

const TODAY = '2026-09-30';
const state = (): Schedule => sampleSchedule(TODAY);

describe('오늘의 일정 위젯 데이터 (Figma 중형 4×2)', () => {
  it('날짜, 과부하, 남은 오늘 작업 최대 4개(프로젝트 색·D-day)를 만든다', () => {
    const data = buildTodayWidgetData(state(), TODAY);
    expect(data.dateLabel).toBe('9월 30일 수');
    expect(data.overload).toEqual({ hours: '7.5h', capacity: '3h' });
    expect(data.tasks).toHaveLength(4);
    expect(data.tasks[0]).toEqual({ title: '행사 장소 섭외', dday: 'D+2', tone: 'over', color: '#b23a7a' });
    expect(data.remaining).toBe(6);
  });

  it('과부하가 아니면 overload는 없다', () => {
    const s = state();
    s.dailyAvailableHours = 24;
    expect(buildTodayWidgetData(s, TODAY).overload).toBeNull();
  });

  it('스크린리더용 요약 문장을 만든다', () => {
    expect(buildTodayWidgetData(state(), TODAY).accessibilityLabel).toBe('9월 30일 수 오늘의 일정. 과부하 7.5h / 3h. 남은 일 6개: 행사 장소 섭외, 설계 문서 작성, 이번 주차 문제풀이, 보고서 v2 초안 작성');
  });

  it('할 일이 없으면 "오늘 남은 일이 없어요"', () => {
    expect(buildTodayWidgetData({ ...state(), tasks: [] }, TODAY).emptyText).toBe('오늘 남은 일이 없어요');
  });

  it('일정을 받지 못했으면(로그인 전·서버에 닿지 않음) 할 일이 없다고 하지 않고 앱을 열라고 안내한다', () => {
    const data = buildUnavailableWidgetData(TODAY);
    expect(data.tasks).toEqual([]);
    expect(data.overload).toBeNull();
    expect(data.emptyText).toBe('앱을 열면 오늘 할 일을 보여줘요');
    expect(data.accessibilityLabel).toBe('9월 30일 수 오늘의 일정. 앱을 열면 오늘 할 일을 보여줘요');
  });
});
