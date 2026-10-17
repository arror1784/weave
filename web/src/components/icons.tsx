import type { ReactNode } from 'react';

// Figma Make 웹 디자인의 선 아이콘(24 그리드, 1.6 선) — 앱 아이콘과 같은 규칙. 아이콘은 장식이라 의미는 글자나 aria-label로 전한다.

type IconProps = { size?: number; className?: string };
const icon = (path: ReactNode) =>
  function Icon({ size = 20, className }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        {path}
      </svg>
    );
  };

export const IPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IMinus = icon(<path d="M5 12h14" />);
export const ISpark = icon(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />);
export const ICal = icon(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const IUpload = icon(<><path d="M12 15V4M7 9l5-5 5 5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>);
export const IFile = icon(<><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4" /></>);
export const ILink = icon(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
export const IX = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const ITrash = icon(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const ISend = icon(<path d="M5 12h13M13 6l6 6-6 6" />);
export const IUp = icon(<path d="M6 15l6-6 6 6" />);
export const IDown = icon(<path d="M6 9l6 6 6-6" />);
export const IBack = icon(<path d="M15 6l-6 6 6 6" />);
export const IChev = icon(<path d="M9 6l6 6-6 6" />);
export const ICheck = icon(<path d="M4 12l5 5 11-11" />);
export const IWarn = icon(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>);
export const IOff = icon(<><path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.4M12 20h.01M19 13a10 10 0 0 0-2.5-1.8M2 9.5a15 15 0 0 1 4.5-2.8M22 9.5a15 15 0 0 0-9-3.9" /></>);
export const IRetry = icon(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>);
export const IPanel = icon(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M15 4v16" /></>);
export const IPhone = icon(<><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></>);
export const IClock = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IBook = icon(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>);
export const ILock = icon(<><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>);
export const ILinkOn = icon(<path d="M5 5v6a3 3 0 0 0 3 3h11M15 10l4 4-4 4" />);
