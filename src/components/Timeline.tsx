import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Text } from './Text';

export type TimelineItem = {
  label: string;
  /** waktu dari order_status_logs, hanya untuk langkah selesai */
  time?: string;
  state: 'done' | 'active' | 'next';
};

/** Timeline vertikal — ikon selalu jadi penanda selain warna (lihat 9.2). */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <View>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const color =
          item.state === 'done'
            ? colors.success
            : item.state === 'active'
              ? colors.primary
              : colors.borderStrong;
        const icon =
          item.state === 'done'
            ? 'checkmark-circle'
            : item.state === 'active'
              ? 'ellipse'
              : 'ellipse-outline';
        return (
          <View key={`${item.label}-${idx}`} style={styles.row}>
            <View style={styles.gutter}>
              <Ionicons name={icon} size={20} color={color} />
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: item.state === 'done' ? colors.success : colors.border },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.content}>
              <Text
                variant="body"
                color={item.state === 'next' ? colors.textMuted : colors.text}
                style={item.state === 'active' ? styles.activeLabel : undefined}
              >
                {item.label}
              </Text>
              {item.time ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {item.time}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  gutter: { alignItems: 'center', width: 20 },
  line: { width: 2, flex: 1, marginVertical: 2, minHeight: 24 },
  content: { flex: 1, paddingBottom: spacing.lg },
  activeLabel: { fontWeight: '700' },
});
