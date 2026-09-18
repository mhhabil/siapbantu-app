import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.active : styles.inactive]}
    >
      <Text variant="label" color={active ? colors.primary : colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  inactive: { backgroundColor: colors.surface, borderColor: colors.border },
});
