import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { useMockStore } from '@/mocks/MockStoreProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, dispatch } = useMockStore();

  return (
    <Screen scroll>
      <AppText variant="title">설정</AppText>
      <ListItem title="계정 관리" subtitle={state.session?.email} onPress={() => router.push('/settings/account')} />
      <Button label="로그아웃" variant="secondary" onPress={() => dispatch({ type: 'signOut' })} />
    </Screen>
  );
}
