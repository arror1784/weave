import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { WeaveMark } from './WeaveMark';

/** 로딩 화면 (Figma 00): 로고가 엮이고, 이름과 로딩 막대가 나온 뒤 onDone. */
export function Splash({ onDone, duration = 2600 }: { onDone: () => void; duration?: number }) {
  const { colors, radius } = useAppTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      const total = reduce ? 600 : duration;
      if (reduce) {
        progress.setValue(1);
        fade.setValue(1);
      } else {
        Animated.timing(fade, { toValue: 1, duration: 400, delay: 600, useNativeDriver: true }).start();
        Animated.timing(progress, { toValue: 1, duration: total - 200, useNativeDriver: false }).start();
      }
      timer = setTimeout(onDone, total);
    });
    return () => clearTimeout(timer);
  }, [duration, fade, onDone, progress]);

  return (
    <View accessibilityLabel="Weave 불러오는 중" style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.surface }]}>
      <WeaveMark size={96} animate />
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <AppText variant="hero" style={styles.title}>
          Weave
        </AppText>
        <AppText variant="bodyRegular" tone="soft">
          여러 프로젝트를 하나의 오늘로
        </AppText>
      </Animated.View>
      <View style={[styles.track, { backgroundColor: colors.line, borderRadius: radius.pill }]}>
        <Animated.View style={[styles.bar, { backgroundColor: colors.thread, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <AppText variant="mono" tone="soft" style={styles.footer}>
        쪼개기 · 모으기 · 지키기
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 24, fontSize: 30 },
  track: { marginTop: 64, width: 112, height: 4, overflow: 'hidden' },
  bar: { height: 4 },
  footer: { position: 'absolute', bottom: 40, fontSize: 11, letterSpacing: 2 },
});
