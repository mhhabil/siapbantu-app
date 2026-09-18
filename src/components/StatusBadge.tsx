import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme';
import { Text } from './Text';

export type StatusBadgeProps = {
  label: string;
  fg: string;
  bg: string;
};

/** Badge pill berisi teks — warna tidak pernah jadi satu-satunya penanda. */
export function StatusBadge({ label, fg, bg }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
