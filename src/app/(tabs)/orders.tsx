import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { OrderCard } from '@/components/OrderCard';
import { Text } from '@/components/Text';
import { ACTIVE_STATUSES, type OrderStatus } from '@/constants/orderStatus';
import { useAuth } from '@/hooks/useAuth';
import { useMyOrders, useMyOrdersRealtime } from '@/hooks/useOrders';
import { colors, screenPadding, spacing } from '@/theme';

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const orders = useMyOrders(session?.user.id);
  useMyOrdersRealtime(session?.user.id);

  const [tab, setTab] = useState<'active' | 'history'>('active');

  const list = useMemo(() => {
    const data = orders.data ?? [];
    return data.filter((o) =>
      tab === 'active'
        ? ACTIVE_STATUSES.includes(o.status as OrderStatus)
        : o.status === 'completed' || o.status === 'cancelled'
    );
  }, [orders.data, tab]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1">Pesanan</Text>
        <View style={styles.tabs}>
          <Chip label="Aktif" active={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label="Riwayat" active={tab === 'history'} onPress={() => setTab('history')} />
        </View>
      </View>

      {orders.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : orders.isError ? (
        <ErrorState onRetry={() => orders.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={tab === 'active' ? 'Belum ada pesanan aktif' : 'Belum ada riwayat'}
          description={tab === 'active' ? 'Pesananmu yang sedang berjalan akan tampil di sini.' : undefined}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: screenPadding, paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
});
