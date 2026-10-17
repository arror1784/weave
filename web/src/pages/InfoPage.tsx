import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { NetworkError } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { getProject, listProjects } from '@/api/projects';
import type { Attachment, Project, ProjectDetail } from '@/api/types';
import { AttachPanel } from '@/components/AttachPanel';
import { DateField } from '@/components/DateField';
import { ICheck, IChev } from '@/components/icons';
import { StepFooter, StepHeader } from '@/components/StepHeader';
import { TopBar } from '@/components/TopBar';
import { Btn, Card, ErrorPanel, inputClass, Label, Skeleton } from '@/components/ui';
import { todayKey, type DateKey } from '@/lib/date';
import { fieldErrors, projectBasicSchema } from '@/lib/validation';
import type { Draft } from '@/state/draft';
import { useDraft } from '@/state/DraftProvider';
import { projectColorOrder, projectPalette } from '@/theme/palette';

type Values = { name: string; description: string; deadline: DateKey | null; deliverable: string; progress: string; color: Project['color'] | null; attachments: Attachment[] };
type Replan = { projectId: number; completedTasks: string[] };

const fromDraft = (d: Draft): Values => ({ name: d.name, description: d.description, deadline: d.deadline, deliverable: d.deliverable, progress: d.progress, color: d.color, attachments: d.attachments });
const fromProject = (p: ProjectDetail): Values => ({ name: p.name, description: p.description, deadline: p.deadline, deliverable: p.deliverable, progress: p.progress, color: p.color, attachments: p.attachments });
const EMPTY: Values = { name: '', description: '', deadline: null, deliverable: '', progress: '', color: null, attachments: [] };

/** W3 새 프로젝트 — 챗봇에서 돌아왔으면 초안 값을 그대로 채운다 */
export function InfoPage() {
  const { draft } = useDraft();
  const initial = draft && draft.projectId === undefined ? fromDraft(draft) : EMPTY;
  return <InfoForm initial={initial} replan={null} />;
}

/** "AI에게 재요청" → W3 — 기존 기본 정보·색·첨부를 채워 두고, 확정하면 그 프로젝트의 미완료 작업을 바꾼다(사용자 결정 2026-10-02) */
export function ReplanStartPage() {
  const id = Number(useParams().id);
  const { draft } = useDraft();
  const query = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id), enabled: Number.isFinite(id) });
  if (query.isPending || query.isError) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-[1280px] px-8 pt-8">
          {query.isError ? (
            <Card>
              <ErrorPanel onRetry={() => query.refetch()} text={query.error instanceof NetworkError ? errorMessage(query.error) : '기존 프로젝트 정보를 불러오지 못했어요.'} />
            </Card>
          ) : (
            <div className="grid grid-cols-[1fr_400px] gap-8" aria-busy="true" aria-label="프로젝트 정보를 불러오는 중">
              <Card className="space-y-6 p-8">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-4 w-24" />
                    <Skeleton className={i === 2 ? 'h-28' : 'h-12'} />
                  </div>
                ))}
              </Card>
              <Card className="p-6">
                <Skeleton className="h-40" />
              </Card>
            </div>
          )}
        </main>
      </>
    );
  }
  const project = query.data;
  const replan = { projectId: project.id, completedTasks: project.tasks.filter((t) => t.done).map((t) => t.title) };
  const initial = draft?.projectId === project.id ? fromDraft(draft) : fromProject(project);
  return <InfoForm key={project.id} initial={initial} replan={replan} />;
}

function InfoForm({ initial, replan }: { initial: Values; replan: Replan | null }) {
  const navigate = useNavigate();
  const { dispatch } = useDraft();
  const today = todayKey();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 기본 색: 진행중 프로젝트가 아직 쓰지 않은 색(앱과 같다) — 사용자가 고르면 그 색
  const active = useQuery({ queryKey: ['projects', 'active'], queryFn: () => listProjects('active', 0, 50) });
  const used = (active.data?.items ?? []).filter((p) => p.id !== replan?.projectId).map((p) => p.color);
  const color = values.color ?? projectColorOrder.find((c) => !used.includes(c)) ?? projectColorOrder[used.length % projectColorOrder.length];
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));

  function next() {
    const result = projectBasicSchema.safeParse({ ...values, deadline: values.deadline ?? '' });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      document.getElementById('name')?.focus();
      return;
    }
    dispatch({ type: 'start', ...result.data, color, attachments: values.attachments, ...(replan ?? {}) });
    navigate('/new/chat');
  }

  return (
    <>
      <TopBar />
      <StepHeader step={1} replan={!!replan} title={replan ? values.name || '프로젝트' : '새 프로젝트 등록'} onBack={() => navigate('/')} />
      <main className="mx-auto max-w-[1280px] px-8 pb-32 pt-8">
        <div className="grid grid-cols-[1fr_minmax(340px,400px)] items-start gap-8">
          <Card className="space-y-7 p-8">
            <div>
              <Label htmlFor="name" required>
                프로젝트명
              </Label>
              <input
                id="name"
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="예: 임베디드시스템 과제"
                aria-invalid={!!errors.name}
                aria-describedby="name-error"
                className={`${inputClass} h-12 ${errors.name ? 'border-danger-text' : ''}`}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="mt-1.5 text-[13px] text-danger-text">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="deadline">마감일</Label>
              <DateField value={values.deadline} today={today} onChange={(d) => set('deadline', d)} />
            </div>
            <div>
              <Label htmlFor="description" hint="무엇을, 누구와, 어디까지 하는지 적어 주세요">
                설명·목표
              </Label>
              <textarea
                id="description"
                rows={5}
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="예: 3명이 한 팀으로 STM32 보드로 온습도 측정기를 만들어요. 저는 센서 드라이버를 맡았어요."
                className={`${inputClass} resize-y py-3 leading-relaxed`}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="deliverable">결과물 형태</Label>
                <input id="deliverable" value={values.deliverable} onChange={(e) => set('deliverable', e.target.value)} placeholder="예: 보고서, 발표자료, 앱" className={`${inputClass} h-12`} />
              </div>
              <fieldset>
                <legend className="mb-2 text-[14px] font-semibold">프로젝트 색</legend>
                <div className="flex h-12 items-center gap-2">
                  {projectColorOrder.map((key) => {
                    const c = projectPalette[key];
                    const checked = color === key;
                    return (
                      <label key={key} title={c.label} className="relative cursor-pointer">
                        <input type="radio" name="color" value={key} checked={checked} onChange={() => set('color', key)} aria-label={c.label} className="peer sr-only" />
                        <span
                          className={`grid size-8 place-items-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-thread ${checked ? 'ring-2 ring-offset-2' : ''}`}
                          style={{ background: c.dot, ['--tw-ring-color' as string]: c.dot }}
                        >
                          {checked && <ICheck size={16} className="text-white" />}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-[13px]" style={{ color: projectPalette[color].text }}>
                  선택: {projectPalette[color].label}
                </p>
              </fieldset>
            </div>
            <div>
              <Label htmlFor="progress" hint="이미 해 둔 작업이 있다면 적어 주세요">
                기 진행사항
              </Label>
              <textarea
                id="progress"
                rows={3}
                value={values.progress}
                onChange={(e) => set('progress', e.target.value)}
                placeholder="예: 개발 환경 설치까지 끝냈어요."
                className={`${inputClass} resize-y py-3 leading-relaxed`}
              />
            </div>
          </Card>
          <div className="sticky top-24">
            <AttachPanel attachments={values.attachments} onChange={(update) => setValues((v) => ({ ...v, attachments: update(v.attachments) }))} />
          </div>
        </div>
      </main>
      <StepFooter>
        <span className="mr-auto text-[13px] text-ink-soft">
          <span className="text-danger-text">*</span> 필수 항목
        </span>
        <Btn kind="ghost" onClick={() => navigate('/')}>
          취소
        </Btn>
        <Btn className="min-w-[160px]" onClick={next}>
          다음
          <IChev size={18} />
        </Btn>
      </StepFooter>
    </>
  );
}
