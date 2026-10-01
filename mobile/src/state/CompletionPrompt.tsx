import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Pending = { projectId: number; name: string } | null;
type Value = { pending: Pending; ask: (projectId: number, name: string) => void; dismiss: () => void };

const CompletionPromptContext = createContext<Value | null>(null);

/** "프로젝트가 완료되었습니까?"를 물을 프로젝트 — 어느 화면에서 마지막 작업을 끝내도 루트의 모달이 뜬다(사용자 결정 H) */
export function CompletionPromptProvider({ children, initial = null }: { children: ReactNode; initial?: Pending }) {
  const [pending, setPending] = useState<Pending>(initial);
  const value = useMemo(() => ({ pending, ask: (projectId: number, name: string) => setPending({ projectId, name }), dismiss: () => setPending(null) }), [pending]);
  return <CompletionPromptContext.Provider value={value}>{children}</CompletionPromptContext.Provider>;
}

export function useCompletionPrompt() {
  const value = useContext(CompletionPromptContext);
  if (!value) throw new Error('useCompletionPrompt는 CompletionPromptProvider 안에서만 쓸 수 있다');
  return value;
}
