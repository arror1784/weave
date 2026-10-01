import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { IconCheck, IconWarn } from './icons';

/** success: 완료 알림(체크) · error: 실패 알림(경고, 빨간 바탕) */
export type ToastKind = 'success' | 'error';
type Toast = { message: string; kind: ToastKind };

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** 짧은 알림 (Figma toast — 오류 종류는 Figma에 없어 추가): 아래쪽에 2.2초 떠 있다가 사라진다. 스크린리더에도 읽어 준다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    setToast({ message, kind });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastView {...toast} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ message, kind }: Toast) {
  const { colors, radius } = useAppTheme();
  const Icon = kind === 'error' ? IconWarn : IconCheck;
  return (
    <View testID="toast" pointerEvents="none" style={[styles.toast, { backgroundColor: kind === 'error' ? colors.dangerText : colors.ink, borderRadius: radius.card }]}>
      <Icon size={16} color={colors.onThread} />
      <AppText variant="small" color={colors.onThread} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 20, right: 20, bottom: 110, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, elevation: 6 },
  text: { flex: 1 },
});
