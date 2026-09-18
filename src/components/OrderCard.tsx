import { Pressable, StyleSheet, View } from 'react-native';

import { ORDER_STATUS, type OrderStatus } from '@/constants/orderStatus';
import type { OrderListItem } from '@/hooks/useOrders';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import { StatusBadge } from './StatusBadge';
import { Text } from './Text';

export function OrderCard({ order, onPress }: { order: OrderListItem; onPress: () => void }) {
  const meta = ORDER_STATUS[order.status as OrderStatus];
  const total = order.final_total ?? order.estimated_total;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.flex1}>
          <Text variant="body" numberOfLines={1}>
            {order.providers?.name ?? 'Penyedia'}
          </Text>
          {order.providers?.categories?.name ? (
            <Text variant="bodySmall" color={colors.textSecondary}>
              {order.providers.categories.name}
            </Text>
          ) : null}
        </View>
        <StatusBadge label={meta.label} fg={meta.fg} bg={meta.bg} />
      </View>
      <View style={styles.bottomRow}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {formatDateTime(order.scheduled_at)}
        </Text>
        <Text variant="body">
          {order.final_total != null ? '' : 'est. '}
          {formatRupiah(total)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { backgroundColor: colors.neutralSoft },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex1: { flex: 1, gap: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
