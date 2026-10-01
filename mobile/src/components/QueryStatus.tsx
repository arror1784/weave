import { onlineManager } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

/** 불러오는 중 (§2-6 로딩 상태) */
export function Loading() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.center} accessibilityLabel="불러오는 중">
      <ActivityIndicator color={colors.thread} />
    </View>
  );
}

/** 불러오지 못함 + 다시 시도 (§2-6 에러·오프라인 상태) */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const offline = !onlineManager.isOnline();
  return (
    <View style={styles.center}>
      <AppText tone="soft" style={styles.text}>
        {offline ? '인터넷에 연결되어 있지 않아요.\n연결되면 다시 시도해 주세요.' : errorMessage(error)}
      </AppText>
      <Button label="다시 시도" variant="soft" compact onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 48 },
  text: { textAlign: 'center' },
});
