import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

type ToastVariant = 'default' | 'success' | 'error';

type ToastState = { message: string; variant: ToastVariant } | null;

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'default') => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, variant });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setToast(null);
          }
        );
      }, 2400);
    },
    [opacity]
  );

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: insets.bottom + 90, opacity, backgroundColor: bgFor(toast.variant) },
          ]}
        >
          <Text variant="body" color="#FFFFFF" center>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

function bgFor(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.danger;
    default:
      return colors.navy;
  }
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
