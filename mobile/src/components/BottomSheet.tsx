import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

/**
 * 하단 시트 (Figma sheet): 뒤를 어둡게 하고 아래에서 올라온다. 바깥을 누르거나 뒤로 가기로 닫힌다.
 * 키보드가 올라오면 시트도 따라 올라간다(§4-13) — 없으면 링크 입력칸이 키보드에 완전히 가려졌다.
 */
export function BottomSheet({ visible, onClose, children, label }: { visible: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: 24 + insets.bottom }]}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
});
