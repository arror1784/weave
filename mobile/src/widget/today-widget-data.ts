import { dDayLabel, formatDateLabel, type DateKey } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { selectDayLoad, selectTodayTasks, taskTone, type Tone } from '@/mocks/store';
import type { State } from '@/mocks/types';
import { projectPaletteFor } from '@/theme/colors';

const MAX_TASKS = 4;

export type TodayWidgetData = {
  /** '9월 30일 수' */
  dateLabel: string;
  overload: { hours: string; capacity: string } | null;
  tasks: { title: string; dday: string; tone: Tone; color: string }[];
  remaining: number;
  accessibilityLabel: string;
};

/** 위젯(Figma 중형 4×2)에 그릴 내용 — 위젯은 이미지로 그려지므로 스크린리더용 요약 문장을 따로 만든다. */
export function buildTodayWidgetData(state: State, today: DateKey): TodayWidgetData {
  const pending = selectTodayTasks(state, today).filter((t) => !t.done);
  const load = selectDayLoad(state, today, { includeOverdue: true });
  const dateLabel = formatDateLabel(today).replace(/요일$/, '');
  const overload = load.over ? { hours: formatHours(load.hours), capacity: formatHours(load.capacity) } : null;
  const tasks = pending.slice(0, MAX_TASKS).map((t) => ({
    title: t.title,
    dday: t.dueDate ? dDayLabel(t.dueDate, today) : '',
    tone: taskTone(t, today),
    color: projectPaletteFor(state.projects.find((p) => p.id === t.projectId)?.color ?? 'gray').dot,
  }));

  const summary = [`${dateLabel} 오늘의 일정`];
  if (overload) summary.push(`과부하 ${overload.hours} / ${overload.capacity}`);
  summary.push(pending.length ? `남은 일 ${pending.length}개: ${tasks.map((t) => t.title).join(', ')}` : '남은 일 없음');

  return { dateLabel, overload, tasks, remaining: pending.length, accessibilityLabel: summary.join('. ') };
}
