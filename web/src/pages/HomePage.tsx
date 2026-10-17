import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { NetworkError } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { listProjects } from '@/api/projects';
import type { ProjectSummary } from '@/api/types';
import { IChev, IFile, IPhone, IPlus, ISpark } from '@/components/icons';
import { TopBar } from '@/components/TopBar';
import { Btn, Card, DdayBadge, ErrorPanel, Skeleton } from '@/components/ui';
import { todayKey, type DateKey } from '@/lib/date';
import { useDraft } from '@/state/DraftProvider';
import { projectPalette } from '@/theme/palette';

/** 진행중 프로젝트는 많아야 수십 개 — 한 페이지로 받는다(서버는 페이지네이션 API) */
const PAGE_SIZE = 50;

/** W2 홈 — 새 프로젝트 등록 + 진행중 프로젝트의 "AI에게 재요청". 완료한 프로젝트는 재요청할 수 없어 목록에 넣지 않는다 */
export function HomePage() {
  const navigate = useNavigate();
  const { dispatch } = useDraft();
  const today = todayKey();
  // 새 등록·재요청은 이전 초안을 비우고 시작한다
  const start = (path: string) => {
    dispatch({ type: 'reset' });
    navigate(path);
  };
  const query = useQuery({ queryKey: ['projects', 'active'], queryFn: () => listProjects('active', 0, PAGE_SIZE) });
  const list = query.data?.items ?? [];

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-8 py-10">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(300px,380px)_1fr]">
          <section className="grid grid-cols-[1fr_minmax(320px,420px)] items-end gap-x-8 xl:block">
            <div>
              {/* 계정에 이름이 없어 이름 없이 인사한다(사용자 결정 2026-10-17) */}
              <h1 className="text-[26px] font-bold tracking-tight">안녕하세요</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                새 과제나 활동이 생겼다면 등록해 주세요.
                <br />
                AI가 작업을 쪼개 일정에 엮어 드려요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => start('/new')}
              className="group row-span-2 mt-0 flex w-full items-center gap-4 rounded-2xl bg-thread p-6 text-left text-white transition hover:bg-thread-hover xl:mt-7"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-white/15">
                <IPlus size={26} />
              </span>
              <span className="flex-1">
                <span className="block text-[19px] font-bold">새 프로젝트 등록</span>
                <span className="mt-1 block text-[14px] opacity-80">기본 정보 → AI 챗봇 → 작업 검토</span>
              </span>
              <IChev className="transition group-hover:translate-x-1" />
            </button>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-[14px] leading-relaxed text-ink-soft xl:mt-5 xl:p-5">
              <IPhone size={20} className="mt-0.5 shrink-0 text-thread" />
              <p>
                오늘 할 일 확인과 작업 체크는 <b className="font-semibold text-ink">Weave 폰 앱</b>에서 할 수 있어요.
              </p>
            </div>
          </section>
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold">
                진행중 프로젝트 {query.isSuccess && <span className="num ml-1 text-ink-soft">{list.length}</span>}
              </h2>
              <p className="text-[13px] text-ink-soft">완료한 프로젝트는 목록에 보이지 않아요.</p>
            </div>
            <Card className="overflow-hidden">
              {query.isPending ? (
                <ul aria-busy="true" aria-label="프로젝트 목록을 불러오는 중">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-4 border-b border-line px-6 py-5 last:border-0">
                      <Skeleton className="size-3 rounded-full" />
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="ml-auto h-5 w-40" />
                      <Skeleton className="h-9 w-28" />
                    </li>
                  ))}
                </ul>
              ) : query.isError ? (
                <ErrorPanel onRetry={() => query.refetch()} text={query.error instanceof NetworkError ? errorMessage(query.error) : '프로젝트 목록을 불러오지 못했어요.'} />
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                  <span className="grid size-14 place-items-center rounded-2xl bg-thread-soft text-thread">
                    <IFile size={26} />
                  </span>
                  <p className="text-[16px] font-semibold">진행중인 프로젝트가 없어요</p>
                  <p className="text-[14px] text-ink-soft">과제 공지 PDF를 첨부해 첫 프로젝트를 등록해 보세요.</p>
                </div>
              ) : (
                <ul>
                  {list.map((p) => (
                    <ProjectRow key={p.id} project={p} today={today} onReplan={() => start(`/projects/${p.id}/replan`)} />
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}

function ProjectRow({ project: p, today, onReplan }: { project: ProjectSummary; today: DateKey; onReplan: () => void }) {
  const c = projectPalette[p.color];
  const pct = p.totalCount === 0 ? 0 : Math.round((p.doneCount / p.totalCount) * 100);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(140px,200px)_auto] items-center gap-6 border-b border-line px-6 py-5 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="size-3 shrink-0 rounded-full" style={{ background: c.dot }} aria-hidden="true" />
        <div className="min-w-0">
          {/* 길면 말줄임 — 마우스를 올리면 전체 이름(사용자 요청 2026-10-17) */}
          <p className="truncate text-[16px] font-semibold" title={p.name}>
            {p.name}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: c.text }}>
            {c.label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DdayBadge date={p.deadline} today={today} />
        <span className="num w-[86px] text-[13px] text-ink-soft">{p.deadline ? p.deadline.replaceAll('-', '.') : '마감 없음'}</span>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-[13px]">
          <span className="text-ink-soft">진행률</span>
          <span className="num font-semibold">
            {p.doneCount}/{p.totalCount}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} 진행률`}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.dot }} />
        </div>
      </div>
      <Btn kind="soft" className="h-9 px-3.5 text-[14px]" onClick={onReplan} aria-label={`${p.name} AI에게 재요청`}>
        <ISpark size={17} />
        AI에게 재요청
      </Btn>
    </li>
  );
}
