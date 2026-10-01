import { dDayLabel, formatDateLabel, type DateKey } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { selectDayLoad, selectTodayTasks, taskTone, type ScheduleData, type Tone } from '@/lib/schedule';
import { colors, projectPaletteFor } from '@/theme/colors';

const MAX_TASKS = 4;

/** 프로젝트 색 점 — 프로젝트를 못 찾으면 중립 회색 글자색 */
const colorOf = (key: Parameters<typeof projectPaletteFor>[0] | undefined) => (key ? projectPaletteFor(key).dot : colors.inkSoft);

export type TodayWidgetData = {
  /** '9월 30일 수' */
  dateLabel: string;
  overload: { hours: string; capacity: string } | null;
  tasks: { title: string; dday: string; tone: Tone; color: string }[];
  remaining: number;
  /** 보여줄 작업이 없을 때 문구 */
  emptyText: string;
  accessibilityLabel: string;
};

/** 위젯(Figma 중형 4×2)에 그릴 내용 — 위젯은 이미지로 그려지므로 스크린리더용 요약 문장을 따로 만든다. */
export function buildTodayWidgetData(state: ScheduleData, today: DateKey): TodayWidgetData {
  const pending = selectTodayTasks(state, today).filter((t) => !t.done);
  const load = selectDayLoad(state, today, { includeOverdue: true });
  const dateLabel = formatDateLabel(today).replace(/요일$/, '');
  const overload = load.over ? { hours: formatHours(load.hours), capacity: formatHours(load.capacity) } : null;
  const tasks = pending.slice(0, MAX_TASKS).map((t) => ({
    title: t.title,
    dday: t.dueDate ? dDayLabel(t.dueDate, today) : '',
    tone: taskTone(t, today),
    color: colorOf(state.projects.find((p) => p.id === t.projectId)?.color),
  }));

  const summary = [`${dateLabel} 오늘의 일정`];
  if (overload) summary.push(`과부하 ${overload.hours} / ${overload.capacity}`);
  summary.push(pending.length ? `남은 일 ${pending.length}개: ${tasks.map((t) => t.title).join(', ')}` : '남은 일 없음');

  return { dateLabel, overload, tasks, remaining: pending.length, emptyText: '오늘 남은 일이 없어요', accessibilityLabel: summary.join('. ') };
}

const UNAVAILABLE = '앱을 열면 오늘 할 일을 보여줘요';

/** 일정을 받지 못했을 때(로그인 전·서버에 닿지 않음) — "할 일 없음"과 헷갈리지 않게 앱을 열라고 안내한다 */
export function buildUnavailableWidgetData(today: DateKey): TodayWidgetData {
  const dateLabel = formatDateLabel(today).replace(/요일$/, '');
  return { dateLabel, overload: null, tasks: [], remaining: 0, emptyText: UNAVAILABLE, accessibilityLabel: `${dateLabel} 오늘의 일정. ${UNAVAILABLE}` };
}
