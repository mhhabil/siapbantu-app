import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, radius } from '@/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Node ikon opsional di kiri teks. */
  left?: React.ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  left,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        variantContainer(variant, state.pressed, isDisabled),
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.primary} />
      ) : (
        <View style={styles.row}>
          {left}
          <Text variant="body" style={styles.label} color={variantText(variant, isDisabled)}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function variantContainer(variant: ButtonVariant, pressed: boolean, disabled: boolean) {
  if (disabled) {
    return { backgroundColor: colors.disabledBg, borderWidth: 0 };
  }
  switch (variant) {
    case 'primary':
      return { backgroundColor: pressed ? colors.primaryPressed : colors.primary };
    case 'secondary':
      return {
        backgroundColor: pressed ? colors.primarySoft : colors.surface,
        borderWidth: 1.5,
        borderColor: colors.primary,
      };
    case 'danger':
      return {
        backgroundColor: pressed ? colors.dangerSoft : colors.surface,
        borderWidth: 1.5,
        borderColor: colors.danger,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
  }
}

function variantText(variant: ButtonVariant, disabled: boolean) {
  if (disabled) return colors.textMuted;
  switch (variant) {
    case 'primary':
      return '#FFFFFF';
    case 'danger':
      return colors.danger;
    default:
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontWeight: '600' },
});
