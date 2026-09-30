import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useMockStore } from '@/mocks/MockStoreProvider';

export default function AccountScreen() {
  const { state, dispatch } = useMockStore();

  function confirmDelete() {
    Alert.alert('계정 삭제', '계정과 모든 프로젝트·일정이 삭제돼요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      // ⚠ 목업: 서버 탈퇴 처리 없이 로그아웃만 한다. API 연동 시 서버에서 삭제·익명화(루트 CLAUDE.md §3-17).
      { text: '삭제', style: 'destructive', onPress: () => dispatch({ type: 'signOut' }) },
    ]);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Card>
        <AppText variant="label">이메일</AppText>
        <AppText>{state.session?.email ?? ''}</AppText>
      </Card>
      <Button label="로그아웃" variant="secondary" onPress={() => dispatch({ type: 'signOut' })} />
      <Button label="계정 삭제" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
