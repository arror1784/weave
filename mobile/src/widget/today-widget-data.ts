import { formatDateLabel, type DateKey } from '@/lib/date';
import { selectOverdueTasks, selectTasksOn } from '@/mocks/store';
import type { State } from '@/mocks/types';

const MAX_TASKS = 3;

export type TodayWidgetData = {
  dateLabel: string;
  overdueCount: number;
  tasks: string[];
  moreCount: number;
  accessibilityLabel: string;
};

/** 위젯에 그릴 내용 — 위젯은 이미지로 그려지므로 스크린리더용 요약 문장을 따로 만든다. */
export function buildTodayWidgetData(state: State, today: DateKey): TodayWidgetData {
  const pending = selectTasksOn(state, today).filter((t) => !t.done);
  const overdueCount = selectOverdueTasks(state, today).length;
  const dateLabel = formatDateLabel(today);

  const summary = [`${dateLabel} 오늘의 일정`];
  if (overdueCount) summary.push(`밀린 작업 ${overdueCount}건`);
  summary.push(pending.length ? `오늘 할 일 ${pending.length}건: ${pending.map((t) => t.title).join(', ')}` : '오늘 할 일 없음');

  return {
    dateLabel,
    overdueCount,
    tasks: pending.slice(0, MAX_TASKS).map((t) => t.title),
    moreCount: Math.max(0, pending.length - MAX_TASKS),
    accessibilityLabel: summary.join('. '),
  };
}
