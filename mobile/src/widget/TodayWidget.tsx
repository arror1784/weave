'use no memo'; // React Compiler 제외: 위젯 라이브러리가 이 컴포넌트를 React 렌더링 밖에서 함수로 호출한다
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { palette } from '@/theme/colors';

import type { TodayWidgetData } from './today-widget-data';

type Colors = (typeof palette)['light'] | (typeof palette)['dark'];

/**
 * 홈 화면 위젯 "오늘의 일정". 위젯은 RN 뷰가 아니라 이 라이브러리의 위젯 요소로만 그린다.
 * 색은 앱과 같은 토큰(palette)을 쓴다(§5-1). 누르면 앱을 연다.
 */
export function TodayWidget({ data, colors }: { data: TodayWidgetData; colors: Colors }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={data.accessibilityLabel}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: colors.background, borderRadius: 16, padding: 16, flexDirection: 'column', flexGap: 6 }}>
      <TextWidget text={`${data.dateLabel} 오늘의 일정`} style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }} />
      {data.overdueCount > 0 ? <TextWidget text={`밀린 작업 ${data.overdueCount}건`} style={{ fontSize: 14, fontWeight: 'bold', color: colors.danger }} /> : null}
      {data.tasks.length === 0 ? <TextWidget text="오늘 할 일이 없어요" style={{ fontSize: 14, color: colors.textSecondary }} /> : null}
      {data.tasks.map((title) => (
        <TextWidget key={title} text={`□ ${title}`} maxLines={1} truncate="END" style={{ fontSize: 14, color: colors.text }} />
      ))}
      {data.moreCount > 0 ? <TextWidget text={`+${data.moreCount}개 더`} style={{ fontSize: 13, color: colors.textSecondary }} /> : null}
    </FlexWidget>
  );
}
