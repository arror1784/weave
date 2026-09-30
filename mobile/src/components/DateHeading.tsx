import { Text } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

/** 오늘 화면 제목: 날짜는 크게, 요일은 옅게. 스크린리더에는 "9월 30일 수요일" 한 제목으로 읽힌다. */
export function DateHeading({ label }: { label: string }) {
  const { colors, typography } = useAppTheme();
  const lastSpace = label.lastIndexOf(' ');
  const date = label.slice(0, lastSpace);
  const weekday = label.slice(lastSpace + 1);
  return (
    <AppText variant="display">
      {date} <Text style={[typography.title, { color: colors.textSecondary }]}>{weekday}</Text>
    </AppText>
  );
}
