import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { OrderCard } from '@/components/OrderCard';
import { ProviderLogo } from '@/components/ProviderLogo';
import { RupiahText } from '@/components/RupiahText';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { ACTIVE_STATUSES, NEEDS_PAYMENT, type OrderStatus } from '@/constants/orderStatus';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings, useCategories, useFrequentProviders } from '@/hooks/useCatalog';
import { useMyOrders, useMyOrdersRealtime } from '@/hooks/useOrders';
import { firstName } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { colors, radius, screenPadding, spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const categories = useCategories();
  const settings = useAppSettings();
  const frequent = useFrequentProviders(session?.user.id);
  const orders = useMyOrders(session?.user.id);
  useMyOrdersRealtime(session?.user.id);

  const bills = (orders.data ?? []).filter((o) => NEEDS_PAYMENT.includes(o.status as OrderStatus));
  const active = (orders.data ?? [])
    .filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus))
    .slice(0, 3);

  const refreshing = categories.isFetching || frequent.isFetching || orders.isFetching;
  function onRefresh() {
    categories.refetch();
    frequent.refetch();
    orders.refetch();
  }

  function contactCs() {
    const cs = settings.data?.cs_whatsapp;
    if (cs) openWhatsApp(cs, 'Halo CS SiapBantu, saya butuh bantuan.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text variant="h1">
          {firstName(profile?.full_name) || 'Halo'}, mau pakai jasa apa hari ini?
        </Text>

        <SearchBar onPress={() => router.push('/search')} />

        {/* Tagihan — perlu tindakan, ditaruh paling atas */}
        {bills.length > 0 ? (
          <>
            <Text variant="h2" style={styles.sectionTitle}>
              Tagihan
            </Text>
            {bills.map((o) => {
              const nominal =
                o.status === 'awaiting_deposit'
                  ? o.deposit_amount
                  : o.amount_due ?? o.estimated_total;
              return (
                <Card key={o.id} accentColor={colors.warning}>
                  <View style={styles.billTop}>
                    <View style={styles.flex1}>
                      <Text variant="body" numberOfLines={1}>
                        {o.providers?.name ?? 'Penyedia'}
                      </Text>
                      <RupiahText value={nominal} variant="h2" color={colors.warning} />
                    </View>
                    <Button
                      title="Bayar"
                      onPress={() => router.push({ pathname: '/payment/[orderId]', params: { orderId: o.id } })}
                      style={styles.bayarBtn}
                    />
                  </View>
                </Card>
              );
            })}
          </>
        ) : null}

        {/* Pesanan Aktif */}
        {active.length > 0 ? (
          <>
            <Text variant="h2" style={styles.sectionTitle}>
              Pesanan Aktif
            </Text>
            {active.map((o) => (
              <OrderCard key={o.id} order={o} onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} />
            ))}
          </>
        ) : null}

        {/* Kategori */}
        <Text variant="h2" style={styles.sectionTitle}>
          Kategori
        </Text>
        {categories.isError ? (
          <ErrorState onRetry={() => categories.refetch()} />
        ) : (
          <View style={styles.grid}>
            {(categories.data ?? []).map((c) => (
              <Pressable
                key={c.id}
                style={styles.categoryItem}
                onPress={() => router.push({ pathname: '/category/[id]', params: { id: c.id } })}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={32} color={colors.primary} />
                </View>
                <Text variant="bodySmall" center numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Sering Kamu Gunakan */}
        {(frequent.data?.length ?? 0) > 0 ? (
          <>
            <Text variant="h2" style={styles.sectionTitle}>
              Sering Kamu Gunakan
            </Text>
            <View style={styles.frequentList}>
              {frequent.data!.map((p) => (
                <View key={p.id} style={styles.frequentRow}>
                  <ProviderLogo name={p.name} logoUrl={p.logo_url} size={44} />
                  <Text variant="body" style={styles.frequentName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Button
                    title="Pilih"
                    variant="secondary"
                    onPress={() => router.push({ pathname: '/provider/[id]', params: { id: p.id } })}
                    style={styles.pilihBtn}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {categories.data?.length === 0 && !categories.isLoading ? (
          <EmptyState title="Belum ada kategori" />
        ) : null}
      </ScrollView>

      <FloatingChatButton onPress={contactCs} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionTitle: { marginTop: spacing.sm },
  flex1: { flex: 1, gap: 2 },
  billTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bayarBtn: { paddingHorizontal: spacing.xl, minWidth: 96 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryItem: { width: '30%', alignItems: 'center', gap: spacing.xs },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.icon,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequentList: { gap: spacing.sm },
  frequentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  frequentName: { flex: 1 },
  pilihBtn: { paddingHorizontal: spacing.lg, minWidth: 90 },
});
