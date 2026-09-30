import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { IconCheck } from './icons';

const ToastContext = createContext<(message: string) => void>(() => {});

/** 짧은 완료 알림 (Figma toast): 아래쪽에 2.2초 떠 있다가 사라진다. 스크린리더에도 읽어 준다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    AccessibilityInfo.announceForAccessibility(m);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? <ToastView message={message} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ message }: { message: string }) {
  const { colors, radius } = useAppTheme();
  return (
    <View pointerEvents="none" style={[styles.toast, { backgroundColor: colors.ink, borderRadius: radius.card }]}>
      <IconCheck size={16} color={colors.onThread} />
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
