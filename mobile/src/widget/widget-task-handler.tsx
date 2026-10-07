import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { flushActivity, logActivity } from '@/api/activity';
import { getSchedule } from '@/api/projects';
import { todayKey } from '@/lib/date';
import { colors } from '@/theme/colors';

import { TodayWidget } from './TodayWidget';
import { buildTodayWidgetData, buildUnavailableWidgetData } from './today-widget-data';

/**
 * 위젯 이벤트 처리기 — 앱 화면과 별개로 백그라운드(headless)에서 실행된다.
 * 서버 일정을 받는다(앱이 꺼져 있어 액세스 토큰이 없으면 401 → 보안 저장소의 리프레시 토큰으로 한 번 갱신). 로그인 전이거나 서버에 닿지 않으면 앱을 열라는 안내를 그린다.
 * 앱이 켜져 있을 때는 앱이 일정을 받을 때마다 바로 다시 그린다(sync-today-widget).
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const schedule = await loadSchedule();
      // 일정을 받지 못하면 "할 일 없음"이 아니라 앱을 열라는 안내를 그린다
      const data = schedule ? buildTodayWidgetData(schedule, schedule.today) : buildUnavailableWidgetData(todayKey());
      // 앱과 같이 밝은 테마만 쓴다
      props.renderWidget(<TodayWidget data={data} colors={colors} />);
      // 사용 기록(사용자 결정 2026-10-07) — 일정을 받은 갱신만. 기록이 실패해도 위젯에는 영향 없다
      if (schedule) {
        logActivity('WIDGET_RENDERED', { action: props.widgetAction, taskCount: data.tasks.length });
        try {
          await flushActivity();
        } catch {
          // 기록을 못 보내도 위젯은 그대로
        }
      }
      break;
    }
    default:
      break;
  }
}

/**
 * 토큰을 미리 갱신하지 않는다 — 공통 request()가 401일 때만 한 번 갱신한다(앱과 같은 진행 중 갱신을 공유).
 * 전에는 위젯이 갱신될 때마다 리프레시 토큰을 교체해서, 교체가 겹치거나 저장 도중 끊기면 서버가 "재사용"으로 보고
 * 그 사용자의 토큰을 전부 폐기(강제 로그아웃)할 위험이 있었다.
 */
async function loadSchedule() {
  try {
    return await getSchedule();
  } catch {
    return null;
  }
}
