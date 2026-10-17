import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import type { Project } from '@/api/types';
import { dDayLabel, diffInDays, type DateKey } from '@/lib/date';
import { projectPalette } from '@/theme/palette';

import { IOff, IRetry, IWarn } from './icons';

// Figma Make 웹 디자인의 공통 부품. 색은 styles.css의 @theme 토큰(앱과 같은 값)으로만 쓴다.

export function Spinner({ size = 18, light, label = '불러오는 중' }: { size?: number; light?: boolean; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`web-spin inline-block rounded-full border-2 ${light ? 'border-white/35 border-t-white' : 'border-line border-t-thread'}`}
      style={{ width: size, height: size }}
    />
  );
}

type BtnKind = 'primary' | 'soft' | 'ghost' | 'line';
const btnKind: Record<BtnKind, string> = {
  primary: 'bg-thread text-white hover:bg-thread-hover disabled:bg-line disabled:text-ink-soft',
  soft: 'bg-thread-soft text-thread hover:bg-thread-soft-hover disabled:opacity-50',
  ghost: 'text-ink-soft hover:bg-canvas hover:text-ink disabled:opacity-40',
  line: 'border border-line bg-white text-ink hover:border-control disabled:opacity-40',
};

/** 크기·여백·글자 크기는 className에 주면 그걸 쓴다(겹치는 유틸리티를 피한다) */
export function Btn({ kind = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  const h = /(^|\s)(h-|size-)/.test(className) ? '' : 'h-11';
  const px = /(^|\s)px-/.test(className) ? '' : 'px-4';
  const tx = /(^|\s)text-\[/.test(className) ? '' : 'text-[15px]';
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors disabled:cursor-not-allowed ${h} ${px} ${tx} ${btnKind[kind]} ${className}`}
    />
  );
}

/** 입력칸마다 보이는 라벨(placeholder는 라벨이 아니다) */
export function Label({ htmlFor, children, required, hint }: { htmlFor?: string; children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-baseline gap-1.5 text-[14px] font-semibold">
      {children}
      {required && (
        <span className="text-danger-text" aria-label="필수">
          *
        </span>
      )}
      {hint && <span className="ml-1 text-[13px] font-normal text-ink-soft">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-control bg-white px-3.5 text-[15px] placeholder:text-ink-soft focus:border-thread focus:outline-none focus-visible:outline-2';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-2xl border border-line bg-white ${className}`} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`web-skel ${className}`} aria-hidden="true" />;
}

export function ErrorPanel({ onRetry, text = '불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }: { onRetry: () => void; text?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger-text">
        <IWarn size={24} />
      </span>
      <p className="text-[15px] font-semibold text-danger-text">{text}</p>
      <Btn kind="line" onClick={onRetry}>
        <IRetry size={18} />
        다시 시도
      </Btn>
    </div>
  );
}

export function OfflineBar({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-center gap-3 bg-danger-soft px-6 py-2.5 text-[14px] font-semibold text-danger-text">
      <IOff size={18} />
      서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.
      <button type="button" onClick={onRetry} className="ml-2 rounded-lg px-2 py-1 underline underline-offset-2 hover:bg-white/60">
        다시 연결
      </button>
    </div>
  );
}

export function ColorTag({ color, small }: { color: Project['color']; small?: boolean }) {
  const c = projectPalette[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${small ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-1 text-[13px]'}`}
      style={{ background: c.soft, color: c.text }}
    >
      <span className="size-2 rounded-full" style={{ background: c.dot }} aria-hidden="true" />
      {c.label}
    </span>
  );
}

/** 마감 D-day — 없으면 "상시", 지났으면 빨강, 3일 이내면 주황 */
export function DdayBadge({ date, today }: { date: DateKey | null; today: DateKey }) {
  const left = date ? diffInDays(today, date) : null;
  const tone =
    left === null ? 'bg-canvas text-ink-soft' : left < 0 ? 'bg-danger-soft text-danger-text' : left <= 3 ? 'bg-warn-soft text-warn-text' : 'bg-thread-soft text-thread';
  return <span className={`num inline-flex h-6 items-center rounded-md px-2 text-[12px] font-bold ${tone}`}>{date ? dDayLabel(date, today) : '상시'}</span>;
}
