import { useEffect, useRef, useState } from 'react';

import { dayOfMonth, diffInDays, formatDateLabel, monthGrid, monthOf, startOfMonthShift, type DateKey } from '@/lib/date';

import { IBack, ICal, IChev } from './icons';
import { DdayBadge, inputClass } from './ui';

const WEEK = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 마감일 — 누르면 달력이 열린다. 지난 날짜도 고를 수 있다(사용자 결정 2026-10-17). "마감 없음(상시)"이면 null.
 * 주는 월요일부터(앱과 같게 — Figma 웹 디자인은 일요일부터).
 */
export function DateField({ value, today, onChange }: { value: DateKey | null; today: DateKey; onChange: (d: DateKey | null) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonthShift(value ?? today, 0));
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <button
          ref={buttonRef}
          id="deadline"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`마감일, ${value ? formatDateLabel(value) : '마감 없음(상시)'}`}
          className={`${inputClass} flex h-12 max-w-[260px] items-center gap-2.5 text-left`}
        >
          <ICal size={19} className="text-ink-soft" />
          {value ? <span className="num">{value.replaceAll('-', '.')}</span> : <span className="text-ink-soft">마감 없음(상시)</span>}
        </button>
        <DdayBadge date={value} today={today} />
        {value && diffInDays(today, value) < 0 && <span className="text-[13px] text-danger-text">이미 지난 날짜예요</span>}
      </div>
      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[14px]">
        <input type="checkbox" checked={!value} onChange={(e) => onChange(e.target.checked ? null : today)} className="size-4 accent-thread" />
        마감 없음(상시)
      </label>
      {open && (
        <div role="dialog" aria-label="마감일 선택" className="absolute left-0 top-14 z-20 w-[300px] rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_rgba(28,29,34,.12)]">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="이전 달" className="grid size-8 place-items-center rounded-lg hover:bg-canvas" onClick={() => setMonth(startOfMonthShift(month, -1))}>
              <IBack size={18} />
            </button>
            <span className="num text-[15px] font-bold" aria-live="polite">
              {month.slice(0, 4)}.{String(monthOf(month)).padStart(2, '0')}
            </span>
            <button type="button" aria-label="다음 달" className="grid size-8 place-items-center rounded-lg hover:bg-canvas" onClick={() => setMonth(startOfMonthShift(month, 1))}>
              <IChev size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-ink-soft" aria-hidden="true">
            {WEEK.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(month).map((d, i) =>
              d ? (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(d);
                    close();
                  }}
                  aria-pressed={d === value}
                  aria-label={`${formatDateLabel(d)}${d === today ? ', 오늘' : ''}`}
                  className={`num h-9 rounded-lg text-[13px] ${d === value ? 'bg-thread font-bold text-white' : d === today ? 'bg-thread-soft font-bold text-thread' : d < today ? 'text-ink-soft hover:bg-canvas' : 'hover:bg-canvas'}`}
                >
                  {dayOfMonth(d)}
                </button>
              ) : (
                <span key={`empty-${i}`} />
              ),
            )}
          </div>
          <p className="mt-3 text-[12px] text-ink-soft">
            지난 날짜도 고를 수 있어요. 오늘은 <span className="num">{today.replaceAll('-', '.')}</span>
          </p>
        </div>
      )}
    </div>
  );
}
