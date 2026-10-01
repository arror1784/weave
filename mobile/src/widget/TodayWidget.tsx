'use no memo'; // React Compiler 제외: 위젯 라이브러리가 이 컴포넌트를 React 렌더링 밖에서 함수로 호출한다
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { ColorTokens } from '@/theme/colors';

import type { TodayWidgetData } from './today-widget-data';

type HexColor = `#${string}`;

/**
 * 홈 화면 위젯 "오늘의 일정" (Figma 06 중형 4×2): 날짜 · 과부하 표시 · 남은 작업 4개(프로젝트 색·D-day).
 * 위젯은 RN 뷰가 아니라 이 라이브러리의 위젯 요소로만 그린다. 색은 앱 토큰을 쓴다. 누르면 앱을 연다.
 */
export function TodayWidget({ data, colors }: { data: TodayWidgetData; colors: ColorTokens }) {
  const toneColor = { soft: colors.inkSoft, near: colors.warnText, over: colors.dangerText } as const;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={data.accessibilityLabel}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: colors.surface as HexColor, borderRadius: 26, padding: 16, flexDirection: 'column', flexGap: 8 }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={data.dateLabel} style={{ fontSize: 14, fontWeight: 'bold', color: colors.ink as HexColor }} />
        {data.overload ? (
          <FlexWidget style={{ backgroundColor: colors.warnSoft as HexColor, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <TextWidget text={`과부하 ${data.overload.hours} / ${data.overload.capacity}`} style={{ fontSize: 10, fontWeight: 'bold', color: colors.warnText as HexColor }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
      {data.tasks.length === 0 ? <TextWidget text={data.emptyText} style={{ fontSize: 13, color: colors.inkSoft as HexColor }} /> : null}
      {data.tasks.map((t) => (
        <FlexWidget key={t.title} style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <FlexWidget style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: t.color as HexColor }} />
          <FlexWidget style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: t.color as HexColor }} />
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text={t.title} maxLines={1} truncate="END" style={{ fontSize: 13, color: colors.ink as HexColor }} />
          </FlexWidget>
          {t.dday ? <TextWidget text={t.dday} style={{ fontSize: 12, fontWeight: 'bold', color: toneColor[t.tone] as HexColor }} /> : null}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
