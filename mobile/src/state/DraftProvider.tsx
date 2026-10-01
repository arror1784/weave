import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';

import { draftReducer, type Draft, type DraftAction } from './draft';

const DraftContext = createContext<{ draft: Draft | null; dispatch: Dispatch<DraftAction> } | null>(null);

export function DraftProvider({ children, initial = null }: { children: ReactNode; initial?: Draft | null }) {
  const [draft, dispatch] = useReducer(draftReducer, initial);
  const value = useMemo(() => ({ draft, dispatch }), [draft]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraft는 DraftProvider 안에서만 쓸 수 있다');
  return value;
}
