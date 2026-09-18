import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { Text } from './Text';

export type WaveHeaderProps = {
  title: string;
  subtitle?: string;
};

/** Header gradasi navy→primary di atas layar Login/OTP/Daftar (lihat 9.5). */
export function WaveHeader({ title, subtitle }: WaveHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.navy, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}
    >
      <View style={styles.overlay} />
      <Text variant="h1" color="#FFFFFF">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="rgba(255,255,255,0.9)" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  subtitle: { marginTop: spacing.xs },
});
