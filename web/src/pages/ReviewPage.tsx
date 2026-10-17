import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { sendChat, type ChatTurn } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import { createProject, replaceProjectTasks, type NewProject } from '@/api/projects';
import { IBook, ICheck, IDown, ILinkOn, ILock, IMinus, IPlus, ISpark, ITrash, IUp, IX } from '@/components/icons';
import { StepFooter, StepHeader } from '@/components/StepHeader';
import { TopBar } from '@/components/TopBar';
import { Btn, Card, Spinner } from '@/components/ui';
import { dayOfMonth, monthOf } from '@/lib/date';
import { assistantTurn, canMoveTask, chatProject, newKey, toChatTasks, type DraftTask } from '@/state/draft';
import { useDraft } from '@/state/DraftProvider';

import type { DoneState } from './DonePage';
import { NoDraft } from './NoDraft';

/** 이름 칸이 내용만큼 늘어나게(여러 줄 작업 이름) */
const grow = (el: HTMLTextAreaElement | null) => {
  if (el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
};

/**
 * W5 작업 검토 — 이름·시간·순서·선행 작업을 고친다(등록 전에만, 사용자 결정). 날짜는 등록 후 서버 일정 알고리즘이 정한다.
 * 시간은 0.5 단위, 위로 상한 없음(6시간은 AI 프롬프트로만 — 사용자 결정 2026-10-17, 앱과 같게).
 * "AI에게 다시 정리 요청"은 고친 목록을 지금까지의 대화와 함께 보내고 챗봇 화면에서 답을 보여준다.
 */
export function ReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { draft, dispatch } = useDraft();
  const [open, setOpen] = useState<string[]>([]);
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: ({ projectId, body }: { projectId?: number; body: NewProject }) => (projectId !== undefined ? replaceProjectTasks(projectId, body) : createProject(body)),
  });

  if (!draft) return <NoDraft step={3} />;
  const d = draft;
  const tasks = d.tasks;
  const total = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const unnamed = tasks.filter((t) => !t.title.trim()).length;
  const replanning = d.projectId !== undefined;
  const update = (key: string, changes: Partial<Omit<DraftTask, 'key'>>) => dispatch({ type: 'updateTask', key, changes });

  function confirm() {
    setError(null);
    // 작업 마감일은 서버가 역산한다 — AI가 준 마감일(aiDueDate)은 참고용이라 보내지 않는다(사용자 결정)
    const body: NewProject = {
      name: d.name,
      description: d.description,
      deadline: d.deadline,
      color: d.color,
      deliverable: d.deliverable,
      progress: d.progress,
      tasks: d.tasks.map(({ key, title, description, estimatedHours, dependsOnKey, prerequisite }) => ({ key, title, description, estimatedHours, dependsOnKey, prerequisite })),
      attachmentIds: d.attachments.map((a) => a.id),
      ...(d.conversationId ? { conversationId: d.conversationId } : {}),
    };
    save.mutate(
      { projectId: d.projectId, body },
      {
        onSuccess: ({ lateCount }) => {
          const state: DoneState = { name: d.name, color: d.color, count: d.tasks.length, lateCount, replanned: replanning };
          void queryClient.invalidateQueries({ queryKey: ['projects'] });
          void queryClient.invalidateQueries({ queryKey: ['project'] });
          navigate('/new/done', { state, replace: true });
          dispatch({ type: 'reset' });
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  }

  async function revise() {
    setError(null);
    const history: ChatTurn[] = [...d.chat, { role: 'user', text: '', tasks: toChatTasks(d.tasks) }];
    setRevising(true);
    try {
      const r = await sendChat(chatProject(d), history, d.attachments.map((a) => a.id), d.conversationId);
      dispatch({ type: 'setChat', chat: [...history, assistantTurn(r)] });
      if (r.type === 'tasks' && r.tasks) dispatch({ type: 'setTasks', tasks: r.tasks });
      navigate('/new/chat');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRevising(false);
    }
  }

  return (
    <>
      <TopBar />
      <StepHeader step={3} replan={replanning} title="작업 검토" onBack={() => navigate('/new/chat')} />
      <main className="mx-auto max-w-[1100px] px-8 pb-32 pt-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[14px] text-ink-soft">{d.name}</p>
            <h2 className="mt-1 text-[24px] font-bold tracking-tight">
              작업 <span className="num">{tasks.length}</span>개 · <span className="num text-thread">총 {total}시간</span>
            </h2>
          </div>
          <p className="max-w-[360px] text-right text-[13px] leading-relaxed text-ink-soft">이름과 시간을 직접 고칠 수 있어요. 날짜는 등록 후 다른 프로젝트와 함께 자동으로 배치돼요.</p>
        </div>
        {d.completedTasks && d.completedTasks.length > 0 && (
          <section className="mb-4 rounded-2xl border border-line bg-canvas p-4" aria-label="이미 끝낸 작업">
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-ink-soft">
              <ILock size={15} />
              이미 끝낸 작업 <span className="num">{d.completedTasks.length}</span> · 수정할 수 없어요
            </p>
            <ul className="space-y-1">
              {d.completedTasks.map((title) => (
                <li key={title} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] text-ink-soft">
                  <ICheck size={17} />
                  <span className="flex-1 line-through decoration-ink-faint">{title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tasks.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[16px] font-semibold">남은 작업이 없어요</p>
            <p className="text-[14px] text-ink-soft">작업을 직접 추가하거나 AI에게 다시 정리를 요청하세요.</p>
          </Card>
        ) : (
          <ol className="space-y-3">
            {tasks.map((t, i) => {
              const n = i + 1;
              const dep = tasks.find((x) => x.key === t.dependsOnKey);
              const earlier = tasks.slice(0, i);
              const isOpen = open.includes(t.key);
              return (
                <li key={t.key}>
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <span className="num mt-2 grid size-8 shrink-0 place-items-center rounded-lg bg-canvas text-[14px] font-bold text-ink-soft">{n}</span>
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`task-${t.key}`} className="sr-only">
                          {n}번 작업 이름
                        </label>
                        <textarea
                          id={`task-${t.key}`}
                          rows={1}
                          ref={grow}
                          value={t.title}
                          placeholder="작업 이름을 적어 주세요"
                          onChange={(e) => {
                            grow(e.currentTarget);
                            update(t.key, { title: e.target.value });
                          }}
                          aria-invalid={!t.title.trim()}
                          className="w-full resize-none overflow-hidden rounded-lg border border-transparent px-2 py-1.5 text-[16px] font-semibold leading-snug placeholder:font-normal placeholder:text-ink-soft hover:border-line focus:border-control focus:outline-none"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
                          {t.prerequisite && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#f0ecfc] px-2 py-0.5 text-[12px] font-semibold text-[#5a3fb0]">
                              <IBook size={14} />
                              선행 지식 학습
                            </span>
                          )}
                          {dep ? (
                            <button
                              type="button"
                              onClick={() => update(t.key, { dependsOnKey: null })}
                              aria-label={`선행 작업 연결 해제: ${dep.title || '이름 없는 작업'}`}
                              className="group inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-[13px] hover:border-control"
                            >
                              <ILinkOn size={15} className="text-thread" />
                              <span className="max-w-[260px] truncate">{dep.title || '이름 없는 작업'} 완료 후</span>
                              <IX size={14} className="text-ink-soft group-hover:text-ink" />
                            </button>
                          ) : earlier.length > 0 ? (
                            <select
                              value=""
                              aria-label={`${n}번 작업 선행 작업 연결`}
                              onChange={(e) => e.target.value && update(t.key, { dependsOnKey: e.target.value })}
                              className="rounded-md border border-dashed border-control bg-white px-2 py-0.5 text-[13px] text-ink-soft"
                            >
                              <option value="">+ 선행 작업 연결</option>
                              {earlier.map((e) => (
                                <option key={e.key} value={e.key}>
                                  {e.title || '이름 없는 작업'} 완료 후
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {t.aiDueDate && (
                            <span className="num text-[12px] text-ink-soft">
                              AI 계산 마감 {monthOf(t.aiDueDate)}/{dayOfMonth(t.aiDueDate)} (참고)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line p-1" role="group" aria-label={`${n}번 작업 예상 시간`}>
                        <button
                          type="button"
                          onClick={() => update(t.key, { estimatedHours: Math.max(0.5, t.estimatedHours - 0.5) })}
                          disabled={t.estimatedHours <= 0.5}
                          aria-label={`${n}번 작업 30분 줄이기`}
                          className="grid size-8 place-items-center rounded-lg hover:bg-canvas disabled:opacity-35"
                        >
                          <IMinus size={18} />
                        </button>
                        <span className="num w-14 text-center text-[14px] font-semibold" aria-live="polite">
                          {t.estimatedHours}h
                        </span>
                        <button type="button" onClick={() => update(t.key, { estimatedHours: t.estimatedHours + 0.5 })} aria-label={`${n}번 작업 30분 늘리기`} className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                          <IPlus size={18} />
                        </button>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'moveTask', key: t.key, offset: -1 })}
                          disabled={!canMoveTask(tasks, t.key, -1)}
                          aria-label={`${n}번 작업 위로`}
                          title={i > 0 && !canMoveTask(tasks, t.key, -1) ? '선행 작업보다 앞으로 옮길 수 없어요' : '위로'}
                          className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <IUp size={19} />
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'moveTask', key: t.key, offset: 1 })}
                          disabled={!canMoveTask(tasks, t.key, 1)}
                          aria-label={`${n}번 작업 아래로`}
                          title={i < tasks.length - 1 && !canMoveTask(tasks, t.key, 1) ? '다음 작업의 선행 작업이에요' : '아래로'}
                          className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <IDown size={19} />
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'deleteTask', key: t.key })}
                          aria-label={`${n}번 작업 삭제`}
                          className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-danger-soft hover:text-danger-text"
                        >
                          <ITrash size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="ml-12 mt-2">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? open.filter((k) => k !== t.key) : [...open, t.key])}
                        aria-expanded={isOpen}
                        aria-label={`${n}번 작업 설명 ${isOpen ? '접기' : '보기'}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-thread hover:bg-thread-soft"
                      >
                        {isOpen ? <IUp size={15} /> : <IDown size={15} />}
                        {isOpen ? '설명 접기' : '설명 보기'}
                      </button>
                      {isOpen && <p className="mx-2 mt-2 whitespace-pre-wrap rounded-xl bg-canvas px-4 py-3 text-[14px] leading-relaxed">{t.description || '설명이 없어요.'}</p>}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
        <button
          type="button"
          onClick={() => dispatch({ type: 'addTask', key: newKey('k') })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-4 text-[15px] font-semibold text-ink-soft hover:border-thread hover:text-thread"
        >
          <IPlus size={19} />
          작업 직접 추가
        </button>
      </main>
      <StepFooter width="max-w-[1100px]">
        <Btn kind="soft" onClick={revise} disabled={revising || save.isPending || tasks.length === 0}>
          {revising ? <Spinner size={16} label="AI가 다시 정리하는 중" /> : <ISpark size={18} />}
          AI에게 다시 정리 요청
        </Btn>
        <span className="text-[13px] text-ink-soft">고친 목록을 챗봇으로 보내요</span>
        <span className="ml-auto flex items-center gap-3">
          {error && (
            <span role="alert" className="text-[13px] font-medium text-danger-text">
              {error}
            </span>
          )}
          {unnamed > 0 && (
            <span role="status" className="text-[13px] font-medium text-danger-text">
              이름 없는 작업 <span className="num">{unnamed}</span>개가 있어요
            </span>
          )}
          <Btn className="min-w-[180px]" disabled={save.isPending || revising || tasks.length === 0 || unnamed > 0} onClick={confirm}>
            {save.isPending ? <Spinner light size={16} label="등록하는 중" /> : <ICheck size={18} />}
            등록 완료
          </Btn>
        </span>
      </StepFooter>
    </>
  );
}
