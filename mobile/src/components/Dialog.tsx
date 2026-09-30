import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type Action = { label: string; onPress: () => void; variant?: 'primary' | 'outline' };

/** 가운데 뜨는 확인 창. 바깥을 누르거나 뒤로 가기는 onClose(보통 "아니요"와 같은 동작). */
export function Dialog({ visible, title, body, actions, onClose }: { visible: boolean; title: string; body?: string; actions: Action[]; onClose: () => void }) {
  const { colors, radius } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.sheet }]}>
          <AppText variant="sheetTitle" accessibilityRole="header">
            {title}
          </AppText>
          {body ? (
            <AppText variant="bodyRegular" tone="soft">
              {body}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            {actions.map((a) => (
              <View key={a.label} style={styles.flex}>
                <Button label={a.label} variant={a.variant ?? 'primary'} onPress={a.onPress} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { padding: 24, gap: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex: { flex: 1 },
});
