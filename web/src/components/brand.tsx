/** Weave 마크 — 가로·세로 실이 엮인 모양(Figma Make 웹 디자인). 장식이라 스크린리더는 건너뛴다 */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-thread" />
      <g strokeWidth="5.5">
        <path d="M15 26H49M15 38H49" className="stroke-thread-light" />
        <path d="M26 15V49M38 15V49" stroke="#fff" />
      </g>
      <g strokeWidth="5.5" className="stroke-thread">
        <path d="M33.5 26h-11M41.5 38h-11" />
      </g>
      <g strokeWidth="5.5" className="stroke-thread-light">
        <path d="M20 26h12M32 38h12" />
      </g>
      <g strokeWidth="5.5" stroke="#fff">
        <path d="M38 21v10M26 33v10" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark />
      <span className="text-[19px] font-extrabold tracking-tight">Weave</span>
    </span>
  );
}
