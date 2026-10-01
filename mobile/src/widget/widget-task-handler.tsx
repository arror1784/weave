import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { refreshSession } from '@/api/client';
import { getSchedule } from '@/api/projects';
import { todayKey } from '@/lib/date';
import { colors } from '@/theme/colors';

import { TodayWidget } from './TodayWidget';
import { buildTodayWidgetData } from './today-widget-data';

/**
 * 위젯 이벤트 처리기 — 앱 화면과 별개로 백그라운드(headless)에서 실행된다.
 * 보안 저장소의 리프레시 토큰으로 세션을 얻어 서버 일정을 받는다. 로그인 전이거나 서버에 닿지 않으면 빈 위젯을 그린다.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const schedule = await loadSchedule();
      const today = schedule?.today ?? todayKey();
      const data = buildTodayWidgetData(schedule ?? { projects: [], tasks: [], dailyAvailableHours: 3 }, today);
      // 앱과 같이 밝은 테마만 쓴다
      props.renderWidget(<TodayWidget data={data} colors={colors} />);
      break;
    }
    default:
      break;
  }
}

async function loadSchedule() {
  try {
    return (await refreshSession()) ? await getSchedule() : null;
  } catch {
    return null;
  }
}
