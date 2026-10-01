import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import type { Schedule } from '@/api/types';
import { todayKey } from '@/lib/date';
import { colors } from '@/theme/colors';

import { TodayWidget } from './TodayWidget';
import { buildTodayWidgetData, buildUnavailableWidgetData } from './today-widget-data';

/**
 * 앱이 받은 일정으로 홈 화면 위젯을 바로 다시 그린다. 위젯 혼자서는 30분마다만 갱신되고,
 * 백그라운드 앱을 얼리는 기기(삼성 등)에서는 그마저 늦어 작업이 있는데도 "남은 일이 없어요"로 남아 있었다.
 * 일정이 없으면(로그아웃) 앱을 열라는 안내로 바꾼다. 위젯이 없거나 실패해도 앱 동작에는 영향을 주지 않는다.
 */
export async function syncTodayWidget(schedule: Schedule | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  const data = schedule ? buildTodayWidgetData(schedule, schedule.today) : buildUnavailableWidgetData(todayKey());
  try {
    await requestWidgetUpdate({ widgetName: 'TodayWidget', renderWidget: () => <TodayWidget data={data} colors={colors} /> });
  } catch {
    // 홈 화면에 위젯이 없거나 갱신에 실패해도 무시한다
  }
}
