import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { useMockStore } from '@/mocks/MockStoreProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, dispatch } = useMockStore();

  return (
    <Screen scroll>
      <AppText variant="title">설정</AppText>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem icon="person-outline" title="계정 관리" subtitle={state.session?.email} onPress={() => router.push('/settings/account')} />
      </Card>
      <Button label="로그아웃" variant="secondary" onPress={() => dispatch({ type: 'signOut' })} />
    </Screen>
  );
}
