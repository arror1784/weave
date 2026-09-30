import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Figma(Weave Make 디자인)의 선 아이콘 — 24 그리드, 1.6 선 두께, 둥근 끝. 경로는 디자인 원본 그대로.
// 아이콘은 장식이다: 의미는 옆 글자나 버튼의 accessibilityLabel로 전달한다.

export type IconProps = { size?: number; color: string };

function icon(children: ReactNode) {
  return function Icon({ size = 20, color }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </Svg>
    );
  };
}

export const IconBack = icon(<Path d="M15 6l-6 6 6 6" />);
export const IconPlus = icon(<Path d="M12 5v14M5 12h14" />);
export const IconClock = icon(
  <>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M12 7v5l3 2" />
  </>,
);
export const IconSparkle = icon(
  <>
    <Path d="M12 3l1.6 4.9L18.5 9.5 13.6 11 12 16l-1.6-5L5.5 9.5l4.9-1.6L12 3Z" />
    <Path d="M19 15l.7 2.1 2.1.7-2.1.7L19 21l-.7-2.1-2.1-.7 2.1-.7L19 15Z" />
  </>,
);
export const IconAttach = icon(<Path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.6 1.6 0 0 1-2.3-2.3l7.4-7.4" />);
export const IconEdit = icon(
  <>
    <Path d="M4 20h4l10-10-4-4L4 16v4Z" />
    <Path d="M13.5 6.5l4 4" />
  </>,
);
export const IconCheck = icon(<Path d="M4 12l5 5 11-11" />);
export const IconWarn = icon(
  <>
    <Path d="M12 3 2 20h20L12 3Z" />
    <Path d="M12 10v4M12 17h.01" />
  </>,
);
export const IconFile = icon(
  <>
    <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <Path d="M14 3v5h5" />
  </>,
);
export const IconChat = icon(<Path d="M4 5h16v11H8l-4 3V5Z" />);
export const IconSun = icon(
  <>
    <Circle cx="12" cy="12" r="4" />
    <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const IconCal = icon(
  <>
    <Rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <Path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
);
export const IconFolder = icon(<Path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />);
export const IconGear = icon(
  <>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);
export const IconTrash = icon(<Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const IconLink = icon(
  <>
    <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </>,
);
export const IconImage = icon(
  <>
    <Rect x="3" y="4" width="18" height="16" rx="2.5" />
    <Circle cx="9" cy="10" r="1.8" />
    <Path d="m21 16-5-5-9 9" />
  </>,
);
export const IconSend = icon(<Path d="M5 12h13M13 6l6 6-6 6" />);
export const IconArrowDep = icon(<Path d="M5 5v6a3 3 0 0 0 3 3h11M15 10l4 4-4 4" />);
export const IconUser = icon(
  <>
    <Circle cx="12" cy="8" r="4" />
    <Path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);
export const IconWidget = icon(
  <>
    <Rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <Rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <Rect x="3.5" y="13.5" width="17" height="7" rx="2" />
  </>,
);
export const IconChevron = icon(<Path d="M9 6l6 6-6 6" />);
export const IconChevronDown = icon(<Path d="M6 9l6 6 6-6" />);
export const IconMail = icon(
  <>
    <Rect x="3" y="5" width="18" height="14" rx="2.5" />
    <Path d="m4 7 8 6 8-6" />
  </>,
);
export const IconLock = icon(
  <>
    <Rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </>,
);
