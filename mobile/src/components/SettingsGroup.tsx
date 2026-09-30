import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { SectionLabel } from './SectionLabel';

/** 설정 묶음 (Figma Group): 섹션 라벨 + 흰 카드 */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <SectionLabel>{title}</SectionLabel>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

/** 설정 한 줄 (Figma Row): 아이콘 + 라벨 + 오른쪽 요소 */
export function SettingsRow({ icon, label, right, onPress, divider }: { icon: (c: string) => ReactNode; label: string; right?: ReactNode; onPress?: () => void; divider?: boolean }) {
  const { colors } = useAppTheme();
  const content = (
    <>
      {icon(colors.inkSoft)}
      <AppText variant="small" style={styles.label}>
        {label}
      </AppText>
      {right}
    </>
  );
  const style = [styles.row, divider && { borderTopWidth: 1, borderTopColor: colors.line }];
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: colors.canvas }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  label: { flex: 1, fontSize: 14 },
});
