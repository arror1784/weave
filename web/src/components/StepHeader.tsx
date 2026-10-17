import { IBack, ICheck, ISpark } from './icons';
import { Btn } from './ui';

const STEPS = ['기본 정보', 'AI 챗봇', '작업 검토'];

/** 등록 단계 머리글 — 3단계 진행 표시와, 재요청이면 "AI에게 재요청" 표시 */
export function StepHeader({ step, replan, title, onBack }: { step: 1 | 2 | 3; replan: boolean; title: string; onBack: () => void }) {
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-8 py-5">
        <Btn kind="ghost" className="h-9 w-9 px-0" onClick={onBack} aria-label="이전 단계">
          <IBack />
        </Btn>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-[20px] font-bold tracking-tight">{title}</h1>
          {replan && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-thread-soft px-2.5 py-1 text-[13px] font-semibold text-thread">
              <ISpark size={15} />
              AI에게 재요청
            </span>
          )}
        </div>
        <ol className="ml-auto flex items-center gap-2" aria-label={`프로젝트 등록 ${step}/3 단계`}>
          {STEPS.map((s, i) => {
            const n = i + 1;
            const current = n === step;
            const past = n < step;
            return (
              <li key={s} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                {i > 0 && <span className={`h-px w-8 ${past || current ? 'bg-thread' : 'bg-line'}`} aria-hidden="true" />}
                <span
                  className={`num grid size-7 place-items-center rounded-full text-[13px] font-bold ${current ? 'bg-thread text-white' : past ? 'bg-thread-soft text-thread' : 'border border-line text-ink-soft'}`}
                >
                  {past ? <ICheck size={15} /> : n}
                </span>
                <span className={`text-[14px] ${current ? 'font-bold' : 'text-ink-soft'}`}>{s}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** 등록 단계 아래쪽 고정 바 */
export function StepFooter({ children, width = 'max-w-[1280px]' }: { children: React.ReactNode; width?: string }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white">
      <div className={`mx-auto flex ${width} items-center justify-end gap-3 px-8 py-4`}>{children}</div>
    </footer>
  );
}
