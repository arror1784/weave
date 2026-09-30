import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { TopBar } from './TopBar';

/** 등록 단계 머리 (Figma NewProject): 상단 바 + "n / 3" + 3칸 진행 막대 */
export function StepHeader({ step, title, onBack }: { step: 1 | 2 | 3; title: string; onBack: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <TopBar
        title={title}
        onBack={onBack}
        right={
          <AppText variant="mono" tone="soft" style={styles.count} accessibilityLabel={`${step}단계, 전체 3단계`}>
            {`${step} / 3`}
          </AppText>
        }
      />
      <View style={styles.segments} accessible={false}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= step ? colors.thread : colors.line }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { paddingRight: 12 },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingBottom: 12 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
