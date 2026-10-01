import { errorMessage } from '@/api/errors';
import { withParticle } from '@/lib/korean';
import { useSetTaskDone, useUpdateProject } from '@/queries/projects';
import { useCompletionPrompt } from '@/state/CompletionPrompt';

import { Dialog } from './Dialog';
import { useToast } from './Toast';

/**
 * 프로젝트의 마지막 작업을 끝내면 "프로젝트가 완료되었습니까?"를 묻는다(사용자 결정 H).
 * 앱 안 모달이고 푸시 알림이 아니다. "아직이에요"는 마지막 작업의 체크를 푼다.
 */
export function ProjectCompleteDialog() {
  const toast = useToast();
  const { pending, dismiss } = useCompletionPrompt();
  const update = useUpdateProject();
  const setDone = useSetTaskDone();
  if (!pending) return null;

  /** 아직이에요 → 방금 체크한 마지막 작업의 체크를 푼다. 다시 체크하면 또 묻는다(사용자 결정 2026-10-01) */
  const notYet = () => {
    const { taskId } = pending;
    dismiss();
    setDone.mutate({ taskId, done: false }, { onError: (e) => toast(errorMessage(e), 'error') });
  };

  const complete = () => {
    const { projectId, name } = pending;
    dismiss();
    update.mutate(
      { id: projectId, changes: { status: 'done' } },
      { onSuccess: () => toast(`${withParticle(name, '을', '를')} 완료했어요`), onError: (e) => toast(errorMessage(e), 'error') },
    );
  };

  return (
    <Dialog
      visible
      title="프로젝트가 완료되었습니까?"
      body={`${pending.name}의 작업을 모두 끝냈어요.`}
      onClose={notYet}
      actions={[
        { label: '아직이에요', variant: 'outline', onPress: notYet },
        { label: '완료', onPress: complete },
      ]}
    />
  );
}
