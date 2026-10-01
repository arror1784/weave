import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { sampleSchedule } from '@/test-utils/fixtures';

import { syncTodayWidget } from './sync-today-widget';

jest.mock('react-native-android-widget', () => ({ requestWidgetUpdate: jest.fn(async () => {}), FlexWidget: 'FlexWidget', TextWidget: 'TextWidget' }));
const request = jest.mocked(requestWidgetUpdate);

type Rendered = { props: { data: { tasks: { title: string }[]; emptyText: string } } };
const rendered = async () => (await request.mock.calls.at(-1)![0].renderWidget({} as never)) as unknown as Rendered;

describe('홈 화면 위젯 즉시 갱신', () => {
  const original = Platform.OS;
  // 위젯은 Android에만 있다
  beforeEach(() => {
    request.mockClear();
    Platform.OS = 'android';
  });
  afterEach(() => {
    Platform.OS = original;
  });

  it('앱이 받은 일정으로 위젯을 바로 다시 그린다 — 30분 주기 갱신만 기다리지 않는다', async () => {
    await syncTodayWidget(sampleSchedule('2026-09-30'));
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ widgetName: 'TodayWidget' }));
    expect((await rendered()).props.data.tasks.map((t) => t.title)).toContain('설계 문서 작성');
  });

  it('로그아웃하면(일정 없음) 앱을 열라는 안내로 바꾼다', async () => {
    await syncTodayWidget(null);
    expect((await rendered()).props.data.emptyText).toBe('앱을 열면 오늘 할 일을 보여줘요');
  });

  it('위젯 갱신이 실패해도 앱 동작은 멈추지 않는다', async () => {
    request.mockRejectedValueOnce(new Error('no widget'));
    await expect(syncTodayWidget(null)).resolves.toBeUndefined();
  });
});
