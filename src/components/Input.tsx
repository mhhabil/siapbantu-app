import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, typography } from '@/theme';
import { Text } from './Text';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Node tetap di kiri input, mis. prefix "+62". */
  prefix?: React.ReactNode;
};

export function Input({ label, error, prefix, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {prefix}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="bodySmall" color={colors.danger} style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    minHeight: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  fieldFocused: { borderWidth: 1.5, borderColor: colors.primary },
  fieldError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 12,
    ...typography.body,
  },
  errorText: { marginLeft: 2 },
});
