import { render } from '@testing-library/react-native';
import { useEffect, type ReactElement } from 'react';

import { useMockStore, MockStoreProvider } from '@/mocks/MockStoreProvider';
import type { State } from '@/mocks/types';

export const TEST_TODAY = '2026-09-30';

/** 테스트에서 저장소 상태를 들여다보기 위한 창구 */
export const storeRef: { current: State | null } = { current: null };

function StoreProbe() {
  const { state } = useMockStore();
  useEffect(() => {
    storeRef.current = state;
  }, [state]);
  return null;
}

export async function renderWithStore(ui: ReactElement, initial?: Partial<State>) {
  return render(
    <MockStoreProvider today={TEST_TODAY} initial={initial}>
      {ui}
      <StoreProbe />
    </MockStoreProvider>,
  );
}
