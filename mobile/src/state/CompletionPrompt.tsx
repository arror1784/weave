import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** taskId: 마지막으로 체크한 작업 — "아직이에요"를 누르면 이 작업의 체크를 푼다 */
type Pending = { projectId: number; name: string; taskId: number } | null;
type Value = { pending: Pending; ask: (pending: NonNullable<Pending>) => void; dismiss: () => void };

const CompletionPromptContext = createContext<Value | null>(null);

/** "프로젝트가 완료되었습니까?"를 물을 프로젝트 — 어느 화면에서 마지막 작업을 끝내도 루트의 모달이 뜬다(사용자 결정 H) */
export function CompletionPromptProvider({ children, initial = null }: { children: ReactNode; initial?: Pending }) {
  const [pending, setPending] = useState<Pending>(initial);
  const value = useMemo(() => ({ pending, ask: (next: NonNullable<Pending>) => setPending(next), dismiss: () => setPending(null) }), [pending]);
  return <CompletionPromptContext.Provider value={value}>{children}</CompletionPromptContext.Provider>;
}

export function useCompletionPrompt() {
  const value = useContext(CompletionPromptContext);
  if (!value) throw new Error('useCompletionPrompt는 CompletionPromptProvider 안에서만 쓸 수 있다');
  return value;
}
