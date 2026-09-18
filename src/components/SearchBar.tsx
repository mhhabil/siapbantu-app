import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

type CommonProps = { placeholder?: string };

type ButtonMode = CommonProps & { onPress: () => void; value?: undefined };
type InputMode = CommonProps & {
  value: string;
  onChangeText: (t: string) => void;
  autoFocus?: boolean;
  onPress?: undefined;
};

export type SearchBarProps = ButtonMode | InputMode;

/** Mode tombol (navigasi ke S14) atau mode input (S05/S14). */
export function SearchBar(props: SearchBarProps) {
  const placeholder = props.placeholder ?? 'Cari jasa atau penyedia…';

  if ('onPress' in props && props.onPress) {
    return (
      <Pressable style={styles.bar} onPress={props.onPress}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text variant="body" color={colors.textMuted}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  const { value, onChangeText, autoFocus } = props as InputMode;
  return (
    <View style={styles.bar}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 48,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 10, ...typography.body },
});
