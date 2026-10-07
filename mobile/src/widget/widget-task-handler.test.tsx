import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { flushActivity, logActivity } from '@/api/activity';
import { refreshSession } from '@/api/client';
import { getSchedule } from '@/api/projects';
import { sampleSchedule } from '@/test-utils/fixtures';

import { widgetTaskHandler } from './widget-task-handler';

jest.mock('react-native-android-widget', () => ({ FlexWidget: 'FlexWidget', TextWidget: 'TextWidget' }));
jest.mock('@/api/projects');
jest.mock('@/api/activity');
jest.mock('@/api/client', () => ({ refreshSession: jest.fn(async () => true) }));
const schedule = jest.mocked(getSchedule);
const refresh = jest.mocked(refreshSession);

type Rendered = { props: { data: { tasks: { title: string }[]; emptyText: string } } };

async function update() {
  const renderWidget = jest.fn();
  await widgetTaskHandler({ widgetAction: 'WIDGET_UPDATE', renderWidget } as unknown as WidgetTaskHandlerProps);
  return renderWidget.mock.calls[0][0] as Rendered;
}

beforeEach(() => jest.clearAllMocks());

describe('위젯 처리기 (백그라운드)', () => {
  it('토큰을 미리 바꾸지 않고 일정을 바로 요청한다 — 갱신은 401일 때 공통 request가 한 번만 한다', async () => {
    schedule.mockResolvedValueOnce(sampleSchedule('2026-09-30'));
    const rendered = await update();
    expect(refresh).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(rendered.props.data.tasks.map((t) => t.title)).toContain('설계 문서 작성');
  });

  it('일정을 받지 못하면(로그인 전·서버에 닿지 않음) 앱을 열라는 안내를 그린다', async () => {
    schedule.mockRejectedValueOnce(new Error('offline'));
    const rendered = await update();
    expect(rendered.props.data.emptyText).toBe('앱을 열면 오늘 할 일을 보여줘요');
  });

  it('위젯을 그리면 사용 기록(위젯 갱신·오늘 할 일 수)을 남겨 보낸다 — 기록이 실패해도 위젯은 그린다', async () => {
    schedule.mockResolvedValueOnce(sampleSchedule('2026-09-30'));
    jest.mocked(flushActivity).mockRejectedValueOnce(new Error('offline'));
    const rendered = await update();
    expect(rendered.props.data.tasks.length).toBeGreaterThan(0);
    expect(logActivity).toHaveBeenCalledWith('WIDGET_RENDERED', { action: 'WIDGET_UPDATE', taskCount: rendered.props.data.tasks.length });
    expect(flushActivity).toHaveBeenCalled();
  });

  it('일정을 받지 못한 위젯 갱신은 기록하지 않는다(로그인 전일 수 있다)', async () => {
    schedule.mockRejectedValueOnce(new Error('offline'));
    await update();
    expect(logActivity).not.toHaveBeenCalled();
  });
});
