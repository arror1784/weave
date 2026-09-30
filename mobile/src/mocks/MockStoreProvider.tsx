import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';

import { todayKey, type DateKey } from '@/lib/date';

import { createSeed } from './seed';
import { initialState, reducer, type Action } from './store';
import type { State } from './types';

// ⚠ UI 확인용 목업 저장소. API 연동 시 제거한다.

type MockStore = { state: State; dispatch: Dispatch<Action>; today: DateKey };

const MockStoreContext = createContext<MockStore | null>(null);

export function MockStoreProvider({ children, initial, today = todayKey() }: { children: ReactNode; initial?: Partial<State>; today?: DateKey }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...initialState,
    ...createSeed(today),
    ...initial,
  }));
  const value = useMemo(() => ({ state, dispatch, today }), [state, today]);
  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
}

export function useMockStore(): MockStore {
  const store = useContext(MockStoreContext);
  if (!store) throw new Error('useMockStore는 MockStoreProvider 안에서만 쓸 수 있다');
  return store;
}
