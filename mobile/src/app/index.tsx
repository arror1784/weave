import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

export default function HomeScreen() {
  return (
    <Screen style={styles.container}>
      <AppText variant="title">weave</AppText>
      <AppText tone="secondary">프로젝트 초기 화면입니다.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
});
