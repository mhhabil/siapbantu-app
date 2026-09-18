import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDistance, formatRupiah } from '@/lib/format';
import { computeAvailability } from '@/lib/providerStatus';
import type { Provider } from '@/hooks/useCatalog';
import { colors, radius, spacing } from '@/theme';
import { ProviderLogo } from './ProviderLogo';
import { Rating } from './Rating';
import { StatusBadge } from './StatusBadge';
import { Text } from './Text';

export type ProviderCardProps = {
  provider: Provider;
  distanceKm?: number | null;
  onPress: () => void;
};

function paymentLabel(p: Provider): string {
  if (p.payment_type === 'deposit') {
    return `Deposit ${formatRupiah(p.deposit_amount)}, sisanya setelah ditimbang`;
  }
  return 'Bayar di depan';
}

export function ProviderCard({ provider, distanceKm, onPress }: ProviderCardProps) {
  const status = computeAvailability(provider);
  const dimmed = !status.bookable;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, dimmed && styles.dimmed, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <ProviderLogo name={provider.name} logoUrl={provider.logo_url} />
        <View style={styles.info}>
          <Text variant="body" numberOfLines={1}>
            {provider.name}
          </Text>
          <Rating avg={provider.rating_avg} count={provider.rating_count} />
          <View style={styles.metaRow}>
            <StatusBadge label={status.label} fg={status.fg} bg={status.bg} />
            {distanceKm != null ? (
              <View style={styles.distance}>
                <Ionicons name="navigate" size={12} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {formatDistance(distanceKm)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.payment}>
        {paymentLabel(provider)}
      </Text>
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
  dimmed: { opacity: 0.6 },
  pressed: { backgroundColor: colors.neutralSoft },
  header: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  payment: { marginTop: spacing.xs },
});
