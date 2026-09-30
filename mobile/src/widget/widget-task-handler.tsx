import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { todayKey } from '@/lib/date';
import { createSeed } from '@/mocks/seed';
import { initialState } from '@/mocks/store';
import { colors } from '@/theme/colors';

import { TodayWidget } from './TodayWidget';
import { buildTodayWidgetData } from './today-widget-data';

/**
 * 위젯 이벤트 처리기 — 앱 화면과 별개로 백그라운드(headless)에서 실행된다.
 * ⚠ 목업: 앱의 상태와 공유하지 않고 예시 데이터로 그린다. API 연동 시 서버 데이터(또는 기기 캐시)로 교체.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const today = todayKey();
      const data = buildTodayWidgetData({ ...initialState, ...createSeed(today) }, today);
      // 앱과 같이 밝은 테마만 쓴다
      props.renderWidget(<TodayWidget data={data} colors={colors} />);
      break;
    }
    default:
      break;
  }
}
