import { withParticle } from '@/lib/korean';
import { useMockStore } from '@/mocks/MockStoreProvider';

import { Dialog } from './Dialog';
import { useToast } from './Toast';

/**
 * 프로젝트의 마지막 작업을 끝내면 "프로젝트가 완료되었습니까?"를 묻는다(사용자 결정 H).
 * 앱 안 모달이고 푸시 알림이 아니다. 버튼 이름은 Claude 임시안(사용자 확인 필요).
 */
export function ProjectCompleteDialog() {
  const toast = useToast();
  const { state, dispatch } = useMockStore();
  const project = state.projects.find((p) => p.id === state.completionPrompt);
  if (!project) return null;

  const dismiss = () => dispatch({ type: 'dismissCompletionPrompt' });
  const complete = () => {
    dispatch({ type: 'completeProject', projectId: project.id });
    toast(`${withParticle(project.name, '을', '를')} 완료했어요`);
  };

  return (
    <Dialog
      visible
      title="프로젝트가 완료되었습니까?"
      body={`${project.name}의 작업을 모두 끝냈어요.`}
      onClose={dismiss}
      actions={[
        { label: '아직이에요', variant: 'outline', onPress: dismiss },
        { label: '완료', onPress: complete },
      ]}
    />
  );
}
