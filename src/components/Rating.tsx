import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Text } from './Text';

export type RatingProps = {
  avg: number;
  count: number;
};

/** Tampilkan "★ 4,7 (120)" atau "Belum ada rating". */
export function Rating({ avg, count }: RatingProps) {
  if (count <= 0) {
    return (
      <Text variant="bodySmall" color={colors.textMuted}>
        Belum ada rating
      </Text>
    );
  }
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={14} color={colors.star} />
      <Text variant="bodySmall" color={colors.text}>
        {avg.toFixed(1).replace('.', ',')}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary}>
        ({count})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
