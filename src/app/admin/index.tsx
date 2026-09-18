import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { ORDER_STATUS, type OrderStatus } from '@/constants/orderStatus';
import { useAuth } from '@/hooks/useAuth';
import { useAdminOrders, useAdminOrdersRealtime, type AdminOrderRow } from '@/hooks/useAdmin';
import { formatDateTime } from '@/lib/format';
import { colors, radius, screenPadding, spacing } from '@/theme';

type Tab = 'verify' | 'confirm' | 'running' | 'all';

const TABS: { key: Tab; label: string; statuses?: OrderStatus[] }[] = [
  { key: 'verify', label: 'Perlu Verifikasi', statuses: ['verifying_deposit', 'verifying_payment'] },
  { key: 'confirm', label: 'Perlu Konfirmasi', statuses: ['awaiting_provider'] },
  { key: 'running', label: 'Berjalan', statuses: ['on_the_way', 'in_progress', 'delivering'] },
  { key: 'all', label: 'Semua' },
];

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { isAdmin, initializing } = useAuth();
  const orders = useAdminOrders();
  useAdminOrdersRealtime();
  const [tab, setTab] = useState<Tab>('verify');

  const list = useMemo(() => {
    const data = orders.data ?? [];
    const cfg = TABS.find((t) => t.key === tab);
    if (!cfg?.statuses) return data;
    return data.filter((o) => cfg.statuses!.includes(o.status as OrderStatus));
  }, [orders.data, tab]);

  if (!initializing && !isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Panel Admin" />
        <EmptyState icon="lock-closed-outline" title="Akses ditolak" description="Halaman ini hanya untuk admin." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Panel Admin" />
      <View style={styles.tabsWrap}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => (
            <Chip label={item.label} active={tab === item.key} onPress={() => setTab(item.key)} />
          )}
        />
      </View>

      {orders.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : orders.isError ? (
        <ErrorState onRetry={() => orders.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Tidak ada pesanan di tab ini" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <AdminRow order={item} onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: item.id } })} />}
        />
      )}
    </SafeAreaView>
  );
}

function AdminRow({ order, onPress }: { order: AdminOrderRow; onPress: () => void }) {
  const meta = ORDER_STATUS[order.status as OrderStatus];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowTop}>
        <Text variant="body">{order.code}</Text>
        <StatusBadge label={meta.label} fg={meta.fg} bg={meta.bg} />
      </View>
      <Text variant="bodySmall" color={colors.textSecondary}>
        {order.profiles?.full_name ?? 'User'} · {order.providers?.name ?? 'Penyedia'}
      </Text>
      <Text variant="bodySmall" color={colors.textMuted}>
        Update: {formatDateTime(order.updated_at)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabsWrap: { paddingBottom: spacing.sm },
  tabs: { paddingHorizontal: screenPadding, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pressed: { backgroundColor: colors.neutralSoft },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
