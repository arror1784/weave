import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { IconCheck } from './icons';

/** 완료 체크 (Figma: 20×20, 둥근 모서리 7, 완료 시 프로젝트 색). 터치 영역은 48dp로 넓힌다(§5.2-7). */
export function Checkbox({ checked, onToggle, label, color }: { checked: boolean; onToggle: () => void; label: string; color?: string }) {
  const { colors } = useAppTheme();
  const fill = color ?? colors.thread;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onToggle} hitSlop={14} style={styles.hit}>
      <View style={[styles.box, { borderColor: checked ? fill : colors.control, backgroundColor: checked ? fill : 'transparent' }]}>
        {checked ? <IconCheck size={13} color={colors.onThread} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { paddingTop: 2 },
  box: { width: 20, height: 20, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
