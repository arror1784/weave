import type { Tone } from '@/lib/schedule';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

/** D-day 숫자 (Figma: 정상 기본 / 임박 D-1~D-Day 주황 / 지연 빨강, JetBrains Mono) */
export function DDay({ label, tone = 'soft' }: { label: string; tone?: Tone }) {
  const { colors } = useAppTheme();
  const color = { soft: colors.inkSoft, near: colors.warnText, over: colors.dangerText }[tone];
  return (
    <AppText variant="mono" color={color}>
      {label}
    </AppText>
  );
}
