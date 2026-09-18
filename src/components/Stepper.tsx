import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

export type StepperProps = {
  value: number;
  step: number;
  min?: number;
  onChange: (v: number) => void;
  /** teks satuan di belakang angka, mis. "kg" */
  unit?: string;
};

export function Stepper({ value, step, min = step, onChange, unit }: StepperProps) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(+(value + step).toFixed(2));
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');

  return (
    <View style={styles.row}>
      <Pressable style={styles.btn} onPress={dec} hitSlop={6}>
        <Ionicons name="remove" size={18} color={colors.primary} />
      </Pressable>
      <Text variant="body" style={styles.value}>
        {display}
        {unit ? ` ${unit}` : ''}
      </Text>
      <Pressable style={styles.btn} onPress={inc} hitSlop={6}>
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: {
    width: 32,
    height: 32,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 56, textAlign: 'center' },
});
