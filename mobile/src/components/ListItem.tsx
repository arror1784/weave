import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

/** 눌러서 다른 화면으로 가는 목록 한 줄. */
export function ListItem({ title, subtitle, onPress, icon }: { title: string; subtitle?: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { paddingVertical: spacing.sm, gap: spacing.md }, pressed && { opacity: 0.7 }]}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
