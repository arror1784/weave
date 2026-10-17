import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { sendChat, type ChatTask, type ChatTurn } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import { Mark } from '@/components/brand';
import { ICheck, IChev, IFile, ILink, IPanel, IRetry, ISend, ISpark, IWarn, IX } from '@/components/icons';
import { StepFooter, StepHeader } from '@/components/StepHeader';
import { TopBar } from '@/components/TopBar';
import { Btn, ColorTag, DdayBadge, Spinner } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { parseBold } from '@/lib/markdown';
import { assistantTurn, chatProject } from '@/state/draft';
import { useDraft } from '@/state/DraftProvider';

import { NoDraft } from './NoDraft';

/**
 * W4 AI 챗봇 — 서버가 Claude API를 부르고, 사용자 프롬프트(docs/Weave-AI 작업 분할 시스템 프롬프트.md)를 따른다.
 * 서버는 대화를 저장하지 않아서 매번 전체 대화와 첨부 id를 보낸다(앱과 같다).
 * 질문 진행 표시(n/5)는 넣지 않는다(사용자 결정 2026-10-01, 웹도 같게 2026-10-17).
 */
export function ChatPage() {
  const navigate = useNavigate();
  const { draft, dispatch } = useDraft();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const [panel, setPanel] = useState(true);
  const end = useRef<HTMLDivElement>(null);
  const project = draft ? chatProject(draft) : null;
  const attachmentIds = draft?.attachments.map((a) => a.id) ?? [];

  // 첫 질문: 대화가 비어 있으면 기본 정보만 보내 받는다(화면에 들어오면 한 번)
  const first = useQuery({
    queryKey: ['project-chat-first', draft?.conversationId],
    queryFn: () => sendChat(project!, [], attachmentIds, draft?.conversationId),
    enabled: !!draft && draft.chat.length === 0 && draft.tasks.length === 0,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const turns: ChatTurn[] = draft?.chat.length ? draft.chat : first.data ? [assistantTurn(first.data)] : [];
  const proposed = (draft?.tasks.length ?? 0) > 0 || turns.some((m) => m.tasks?.length && m.role === 'assistant');
  const busy = sending || first.isFetching;
  const busyText =
    first.isFetching && !draft?.chat.length ? '프로젝트 정보를 읽고 첫 질문을 준비하고 있어요…' : proposed ? '고친 내용을 반영해 작업을 다시 정리하고 있어요…' : '답변을 바탕으로 생각하고 있어요…';
  const error = sendError ?? (draft?.chat.length ? undefined : first.error ? errorMessage(first.error) : undefined);
  const locked = busy || !!error;

  useEffect(() => {
    end.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [turns.length, busy, error]);

  if (!draft || !project) return <NoDraft step={2} />;

  async function ask(history: ChatTurn[]) {
    setSending(true);
    setSendError(undefined);
    try {
      const r = await sendChat(project!, history, attachmentIds, draft!.conversationId);
      dispatch({ type: 'setChat', chat: [...history, assistantTurn(r)] });
      if (r.type === 'tasks' && r.tasks) dispatch({ type: 'setTasks', tasks: r.tasks });
    } catch (e) {
      setSendError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || locked) return;
    const history: ChatTurn[] = [...turns, { role: 'user', text }];
    dispatch({ type: 'setChat', chat: history });
    setInput('');
    void ask(history);
  }

  function retry() {
    if (!draft!.chat.length && !sendError) void first.refetch();
    else void ask(turns);
  }

  function review() {
    // 첫 응답에서 바로 작업을 제안했으면 초안에 담고 간다
    if (first.data?.tasks && !draft!.tasks.length) {
      dispatch({ type: 'setChat', chat: turns });
      dispatch({ type: 'setTasks', tasks: first.data.tasks });
    }
    navigate('/new/review');
  }

  const back = () => navigate(draft.projectId !== undefined ? `/projects/${draft.projectId}/replan` : '/new');
  const replan = draft.projectId !== undefined;

  return (
    <>
      <TopBar />
      <StepHeader step={2} replan={replan} title={draft.name} onBack={back} />
      <div className="mx-auto flex h-[calc(100vh-227px)] min-h-[520px] max-w-[1280px] gap-6 px-8 py-6">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white" aria-label="AI 챗봇">
          <div className="flex items-center gap-3 border-b border-line px-6 py-3.5">
            <span className={`grid size-7 place-items-center rounded-full ${proposed ? 'bg-thread-soft text-thread' : 'bg-canvas text-ink-soft'}`}>
              {proposed ? <ICheck size={16} /> : <ISpark size={16} />}
            </span>
            <p className="text-[14px]" aria-live="polite">
              {proposed ? '작업 목록을 받았어요. 고칠 점을 말하거나 검토로 넘어가세요.' : '질문에 답하면 AI가 작업 목록을 제안해요.'}
            </p>
            {!panel && (
              <Btn kind="ghost" className="ml-auto h-8 px-2.5 text-[13px]" onClick={() => setPanel(true)} aria-label="기본 정보 패널 열기">
                <IPanel size={18} />
                기본 정보
              </Btn>
            )}
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-8 py-6" aria-live="polite">
            {turns.map((m, i) => (m.role === 'user' ? <UserBubble key={i} turn={m} /> : <BotTurn key={i} turn={m} />))}
            {busy && (
              <div className="flex items-center gap-3">
                <Mark size={30} />
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md bg-canvas px-4 py-3 text-[15px] text-ink-soft">
                  <Spinner size={16} label="AI가 답을 준비하는 중" />
                  {busyText}
                </div>
              </div>
            )}
            {error && !busy && (
              <div role="alert" className="ml-[42px] flex items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger-text">
                <IWarn size={18} />
                {error}
                <Btn kind="line" className="ml-auto h-8 px-3 text-[13px]" onClick={retry}>
                  <IRetry size={16} />
                  다시 시도
                </Btn>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="border-t border-line p-4">
            <label htmlFor="chat-input" className="mb-2 block text-[13px] font-semibold text-ink-soft">
              메시지 <span className="font-normal">· Enter 보내기, Shift+Enter 줄바꿈</span>
            </label>
            <div className={`flex items-end gap-2 rounded-2xl border px-3 py-2 ${locked ? 'border-line bg-canvas' : 'border-control focus-within:border-thread'}`}>
              <textarea
                id="chat-input"
                rows={2}
                value={input}
                disabled={locked}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // 한글 조합 중 Enter는 글자를 확정하는 키 — 보내지 않는다
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={busy ? 'AI가 답변을 준비하고 있어요' : proposed ? '고칠 점을 말해 주세요' : '답변을 적어 주세요'}
                className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed placeholder:text-ink-soft focus:outline-none disabled:cursor-not-allowed"
              />
              <Btn onClick={send} disabled={locked || !input.trim()} aria-label="보내기" className="size-10 rounded-xl px-0">
                <ISend size={19} />
              </Btn>
            </div>
          </div>
        </section>
        {panel && (
          <aside className="w-[320px] shrink-0 overflow-y-auto rounded-2xl border border-line bg-white p-6" aria-label="기본 정보 요약">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold">기본 정보</h2>
              <Btn kind="ghost" className="h-8 w-8 px-0" onClick={() => setPanel(false)} aria-label="기본 정보 패널 접기">
                <IX size={18} />
              </Btn>
            </div>
            <dl className="space-y-4 text-[14px]">
              <div>
                <dt className="mb-1 text-[13px] text-ink-soft">이름</dt>
                <dd className="font-semibold">{draft.name}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[13px] text-ink-soft">마감</dt>
                <dd className="flex items-center gap-2">
                  {draft.deadline ? <span className="num">{draft.deadline.replaceAll('-', '.')}</span> : '마감 없음'}
                  <DdayBadge date={draft.deadline} today={todayKey()} />
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[13px] text-ink-soft">색</dt>
                <dd>
                  <ColorTag color={draft.color} />
                </dd>
              </div>
              <div>
                <dt className="mb-1.5 text-[13px] text-ink-soft">
                  첨부 <span className="num">{draft.attachments.length}</span>
                </dt>
                <dd>
                  {draft.attachments.length === 0 ? (
                    <p className="text-[13px] text-ink-soft">첨부한 자료가 없어요.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {draft.attachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-[13px]">
                          <span className="text-ink-soft">{a.kind === 'link' ? <ILink size={16} /> : <IFile size={16} />}</span>
                          <span className="truncate">{a.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
            <Btn kind="line" className="mt-6 h-9 w-full text-[14px]" onClick={back}>
              기본 정보 고치기
            </Btn>
          </aside>
        )}
      </div>
      <StepFooter>
        {!proposed && <span className="mr-auto text-[13px] text-ink-soft">AI가 작업 목록을 제안하면 검토로 넘어갈 수 있어요.</span>}
        <Btn kind="ghost" onClick={back}>
          이전
        </Btn>
        <Btn className="min-w-[160px]" disabled={!proposed || busy} onClick={review}>
          작업 검토하기
          <IChev size={18} />
        </Btn>
      </StepFooter>
    </>
  );
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className={i ? 'mt-1.5' : ''}>
          {parseBold(line).map((piece, j) => (piece.bold ? <strong key={j} className="font-bold">{piece.text}</strong> : piece.text))}
        </p>
      ))}
    </>
  );
}

const totalHours = (tasks: ChatTask[]) => tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

function BotTurn({ turn }: { turn: ChatTurn }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">
        <Mark size={30} />
      </span>
      <div className="max-w-[78%] space-y-3">
        <div className="rounded-2xl rounded-tl-md bg-canvas px-4 py-3 text-[15px] leading-relaxed">
          <RichText text={turn.text} />
        </div>
        {turn.tasks && turn.tasks.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-line bg-white" aria-label="제안한 작업 목록">
            <div className="flex items-center justify-between border-b border-line bg-thread-soft px-4 py-3">
              <p className="text-[15px] font-bold text-thread">
                제안한 작업 <span className="num">{turn.tasks.length}</span>개
              </p>
              <p className="num text-[13px] font-semibold text-thread">총 {totalHours(turn.tasks)}시간</p>
            </div>
            <ol className="divide-y divide-line">
              {turn.tasks.map((t, k) => (
                <li key={k} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                  <span className="num w-5 text-ink-soft">{k + 1}</span>
                  <span className="flex-1">{t.title}</span>
                  {t.prerequisite && <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">선행 지식</span>}
                  <span className="num text-[13px] text-ink-soft">{t.estimatedHours}h</span>
                </li>
              ))}
            </ol>
            {turn.assumptions && turn.assumptions.length > 0 && (
              <div className="border-t border-line px-4 py-3">
                <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">AI가 가정한 내용</p>
                <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
                  {turn.assumptions.map((a, k) => (
                    <li key={k}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** 내 말풍선 — 검토 화면에서 고친 목록을 보낸 턴은 글 대신 목록 요약을 보여준다 */
function UserBubble({ turn }: { turn: ChatTurn }) {
  const text = turn.tasks?.length && !turn.text ? `작업 목록을 고쳤어요 · 작업 ${turn.tasks.length}개 · 총 ${totalHours(turn.tasks)}시간\n이대로 다시 정리해 주세요.` : turn.text;
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-thread px-4 py-3 text-[15px] leading-relaxed text-white">{text}</div>
    </div>
  );
}
