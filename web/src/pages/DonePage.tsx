import { Navigate, useLocation, useNavigate } from 'react-router';

import type { Project } from '@/api/types';
import { ICheck, IClock, IPhone, IPlus } from '@/components/icons';
import { TopBar } from '@/components/TopBar';
import { Btn, Card, ColorTag } from '@/components/ui';
import { useDraft } from '@/state/DraftProvider';
import { projectPalette } from '@/theme/palette';

/** 검토 화면이 넘겨 주는 등록 결과 */
export type DoneState = { name: string; color: Project['color']; count: number; lateCount: number; replanned: boolean };

/**
 * W6 등록 완료 — 서버가 다른 프로젝트와 함께 일정을 다시 배치했다.
 * 빠듯한 작업은 서버가 개수만 알려 준다(lateCount) — 어떤 작업인지는 폰 앱 일정에서 본다.
 */
export function DonePage() {
  const navigate = useNavigate();
  const { dispatch } = useDraft();
  const state = useLocation().state as DoneState | null;
  if (!state) return <Navigate to="/" replace />;

  return (
    <>
      <TopBar />
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-8 py-12">
        <Card className="w-full max-w-[560px] p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-thread-soft text-thread">
            <ICheck size={32} />
          </span>
          <h1 className="mt-6 text-[26px] font-bold tracking-tight">{state.replanned ? '작업을 다시 나눴어요' : '등록했어요'}</h1>
          <p className="mt-3 flex items-center justify-center gap-2 text-[17px] font-semibold">
            <span className="size-2.5 rounded-full" style={{ background: projectPalette[state.color].dot }} aria-hidden="true" />
            {state.name}
          </p>
          <div className="mt-2">
            <ColorTag color={state.color} small />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            작업 <span className="num">{state.count}</span>개를 다른 프로젝트와 함께 일정에 다시 배치했어요.
          </p>
          {state.lateCount > 0 && (
            <div role="status" className="mt-6 flex items-start gap-3 rounded-xl bg-warn-soft px-4 py-3.5 text-left text-[14px] text-warn-text">
              <IClock size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">
                  마감이 빠듯한 작업 <span className="num">{state.lateCount}</span>개
                </p>
                <p className="mt-0.5 leading-relaxed">마감을 지키려고 하루 가용 시간을 넘겨 몰아 둔 작업이에요.</p>
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line px-4 py-3.5 text-left text-[14px]">
            <IPhone size={20} className="shrink-0 text-thread" />
            <p>
              폰 앱에서 <b className="font-semibold">오늘 할 일</b>을 확인하세요.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Btn
              kind="line"
              className="h-12"
              onClick={() => {
                dispatch({ type: 'reset' });
                navigate('/new');
              }}
            >
              <IPlus size={18} />
              다른 프로젝트 등록
            </Btn>
            <Btn className="h-12" onClick={() => navigate('/')}>
              홈으로
            </Btn>
          </div>
        </Card>
      </main>
    </>
  );
}
