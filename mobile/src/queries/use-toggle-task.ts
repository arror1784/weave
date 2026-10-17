import { errorMessage } from '@/api/errors';
import type { Task } from '@/api/types';
import { useToast } from '@/components/Toast';
import { useCompletionPrompt } from '@/state/CompletionPrompt';

import { useSetTaskDone } from './projects';

/**
 * 작업 체크 토글 — 마지막 작업을 끝내면 프로젝트 완료 여부를 묻는다. 실패하면 체크는 서버 값 그대로 두고 오류 알림(사용자 결정 2026-10-17).
 * 완료한 프로젝트의 체크를 풀면 서버가 진행중으로 돌린다 — 그렇다고 알린다(사용자 결정 2026-10-18).
 */
export function useToggleTask(projectName: (projectId: number) => string) {
  const setDone = useSetTaskDone();
  const prompt = useCompletionPrompt();
  const toast = useToast();
  return (task: Task) =>
    setDone.mutate(
      { taskId: task.id, done: !task.done },
      {
        onSuccess: (result) => {
          if (result.projectAllDone) prompt.ask({ projectId: task.projectId, name: projectName(task.projectId), taskId: task.id });
          if (result.projectReopened) toast('프로젝트를 다시 진행중으로 돌렸어요');
        },
        onError: (e) => toast(errorMessage(e), 'error'),
      },
    );
}
