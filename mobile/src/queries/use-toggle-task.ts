import type { Task } from '@/api/types';
import { useCompletionPrompt } from '@/state/CompletionPrompt';

import { useSetTaskDone } from './projects';

/** 작업 체크 토글 — 마지막 작업을 끝내면 프로젝트 완료 여부를 묻는다 */
export function useToggleTask(projectName: (projectId: number) => string) {
  const setDone = useSetTaskDone();
  const prompt = useCompletionPrompt();
  return (task: Task) =>
    setDone.mutate(
      { taskId: task.id, done: !task.done },
      { onSuccess: (result) => (result.projectAllDone ? prompt.ask(task.projectId, projectName(task.projectId)) : undefined) },
    );
}
