import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export type CardProps = ViewProps & {
  /** Warna garis kiri aksen (mis. kartu Tagihan pakai warning). */
  accentColor?: string;
  padded?: boolean;
};

export function Card({ accentColor, padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
});
