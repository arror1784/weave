import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// 날실 2 × 씨실 2가 위아래로 교차하는 직조 매듭 — 여러 프로젝트를 엮는다 (Figma WeaveMark, 경로 원본 그대로)
const NAVY = '#2b4c8c';
const WARP = '#ffffff';
const WEFT = '#9db8ec';
const warp = (x: number) => `M${x} 15V49`;
const weft = (y: number) => `M15 ${y}H49`;
/** 교차점에서 위로 지나가는 실: [x, y, 세로여부] */
const OVERS: [number, number, boolean][] = [
  [26, 26, false],
  [38, 26, true],
  [26, 38, true],
  [38, 38, false],
];
const STRANDS = [
  { d: weft(26), color: WEFT },
  { d: weft(38), color: WEFT },
  { d: warp(26), color: WARP },
  { d: warp(38), color: WARP },
];

/** 로고. animate면 실이 차례로 그려진 뒤 교차점이 나타난다(스플래시). "동작 줄이기" 설정이면 바로 완성된 모습. */
export function WeaveMark({ size = 48, animate = false }: { size?: number; animate?: boolean }) {
  const [draws] = useState(() => STRANDS.map(() => new Animated.Value(animate ? 1 : 0)));
  const [knots] = useState(() => new Animated.Value(animate ? 0 : 1));

  useEffect(() => {
    if (!animate) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        draws.forEach((v) => v.setValue(0));
        knots.setValue(1);
        return;
      }
      Animated.stagger(
        140,
        draws.map((v) => Animated.timing(v, { toValue: 0, duration: 900, useNativeDriver: false })),
      ).start();
      Animated.timing(knots, { toValue: 1, duration: 500, delay: 700, useNativeDriver: false }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [animate, draws, knots]);

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessibilityLabel="Weave 로고" accessibilityRole="image">
      <Rect width="64" height="64" rx="16" fill={NAVY} />
      <G strokeWidth={5.5} strokeLinecap="round">
        {STRANDS.map((s, i) => (
          <AnimatedPath key={s.d} d={s.d} stroke={s.color} strokeDasharray="34" strokeDashoffset={draws[i].interpolate({ inputRange: [0, 1], outputRange: [0, 34] })} />
        ))}
      </G>
      <AnimatedG opacity={knots}>
        {OVERS.map(([x, y, vertical], i) => {
          const d = vertical ? `M${x} ${y - 5}V${y + 5}` : `M${x - 5} ${y}H${x + 5}`;
          return (
            <G key={i}>
              <Path d={d} stroke={NAVY} strokeWidth={10} strokeLinecap="butt" />
              <Path d={d} stroke={vertical ? WARP : WEFT} strokeWidth={5.5} strokeLinecap="butt" />
            </G>
          );
        })}
      </AnimatedG>
    </Svg>
  );
}

const AnimatedG = Animated.createAnimatedComponent(G);
