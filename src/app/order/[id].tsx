import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Dialog } from '@/components/Dialog';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { RupiahText } from '@/components/RupiahText';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Timeline } from '@/components/Timeline';
import { useToast } from '@/components/Toast';
import { buildTimeline, canUserCancel, ORDER_STATUS, type OrderStatus } from '@/constants/orderStatus';
import { useCancelOrder, useOrder, useOrderRealtime, type OrderItem, type Payment } from '@/hooks/useOrders';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { colors, screenPadding, spacing } from '@/theme';

const PAYMENT_KIND_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  full: 'Pembayaran',
  settlement: 'Pelunasan',
};
const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: colors.warning },
  approved: { label: 'Diverifikasi', color: colors.success },
  rejected: { label: 'Ditolak', color: colors.danger },
};

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const query = useOrder(id);
  const cancel = useCancelOrder();
  useOrderRealtime(id);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Detail Pesanan" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (query.isError || !query.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Detail Pesanan" />
        <ErrorState onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  const { order, items, payments, logs, provider, review } = query.data;
  const status = order.status as OrderStatus;
  const meta = ORDER_STATUS[status];
  const billed = order.final_total != null;
  const hasApprovedPayment = payments.some((p) => p.status === 'approved');

  const timeline =
    status === 'cancelled'
      ? []
      : buildTimeline(order.payment_type as 'deposit' | 'upfront', status, logs);

  async function doCancel() {
    if (reason.trim().length === 0) return;
    try {
      await cancel.mutateAsync({ orderId: order.id, reason: reason.trim() });
      setCancelOpen(false);
      showToast('Pesanan dibatalkan');
    } catch (e) {
      setCancelOpen(false);
      showToast(e instanceof Error ? e.message : 'Gagal membatalkan', 'error');
    }
  }

  const payLabel = status === 'awaiting_deposit' ? 'Bayar Deposit' : order.payment_type === 'upfront' ? 'Bayar Pesanan' : 'Bayar Tagihan';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={order.code} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text variant="h2">{provider?.name ?? 'Penyedia'}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Jadwal: {formatDateTime(order.scheduled_at)}
            </Text>
          </View>
          <StatusBadge label={meta.label} fg={meta.fg} bg={meta.bg} />
        </View>

        {status === 'cancelled' ? (
          <Card accentColor={colors.danger}>
            <Text variant="label" color={colors.danger}>
              Pesanan Dibatalkan
            </Text>
            {order.cancel_reason ? (
              <Text variant="bodySmall" color={colors.textSecondary}>
                {order.cancel_reason}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Kartu tindakan */}
        {(status === 'awaiting_deposit' || status === 'awaiting_payment') ? (
          <Card accentColor={colors.warning}>
            <Text variant="body">Menunggu pembayaranmu</Text>
            <Button
              title={payLabel}
              onPress={() => router.push({ pathname: '/payment/[orderId]', params: { orderId: order.id } })}
              style={styles.mt}
            />
          </Card>
        ) : null}
        {status === 'completed' && !review ? (
          <Card accentColor={colors.success}>
            <Text variant="body">Pesanan selesai. Beri penilaianmu!</Text>
            <Button
              title="Beri Rating"
              onPress={() => router.push({ pathname: '/review/[orderId]', params: { orderId: order.id } })}
              style={styles.mt}
            />
          </Card>
        ) : null}

        {/* Timeline */}
        {timeline.length > 0 ? (
          <Card>
            <Text variant="h2" style={styles.cardTitle}>
              Status Pesanan
            </Text>
            <Timeline items={timeline} />
          </Card>
        ) : null}

        {/* Rincian Tagihan */}
        <Card>
          <View style={styles.billHead}>
            <Text variant="h2">Rincian Tagihan</Text>
            {!billed ? <StatusBadge label="Estimasi" fg={colors.neutral} bg={colors.neutralSoft} /> : null}
          </View>
          {items.map((it: OrderItem) => {
            const qty = billed ? it.final_qty ?? it.estimated_qty : it.estimated_qty;
            return (
              <View key={it.id} style={styles.billItem}>
                <Text variant="body" style={styles.flex1}>
                  {it.service_name}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {String(qty).replace('.', ',')} {it.unit} × {formatRupiah(it.price)}
                </Text>
                <Text variant="body">{formatRupiah(Math.round(it.price * qty))}</Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <View style={styles.billLine}>
            <Text variant="body">Total</Text>
            <RupiahText value={billed ? order.final_total : order.estimated_total} variant="body" />
          </View>
          {order.payment_type === 'deposit' ? (
            <>
              <View style={styles.billLine}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Deposit dibayar
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  −{formatRupiah(order.deposit_amount)}
                </Text>
              </View>
              <View style={styles.billLine}>
                <Text variant="body">{billed ? 'Sisa Tagihan' : 'Estimasi Sisa'}</Text>
                <RupiahText
                  value={
                    billed
                      ? order.amount_due ?? 0
                      : Math.max(0, order.estimated_total - order.deposit_amount)
                  }
                  variant="h2"
                />
              </View>
              {billed && (order.amount_due ?? 0) < 0 ? (
                <Text variant="bodySmall" color={colors.success}>
                  Kelebihan {formatRupiah(Math.abs(order.amount_due ?? 0))} akan dikembalikan tim SiapBantu.
                </Text>
              ) : null}
            </>
          ) : null}
        </Card>

        {/* Riwayat pembayaran */}
        {payments.length > 0 ? (
          <Card>
            <Text variant="h2" style={styles.cardTitle}>
              Riwayat Pembayaran
            </Text>
            {payments.map((p: Payment) => {
              const st = PAYMENT_STATUS[p.status];
              return (
                <View key={p.id} style={styles.payItem}>
                  <View style={styles.flex1}>
                    <Text variant="body">{PAYMENT_KIND_LABEL[p.kind] ?? p.kind}</Text>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {formatRupiah(p.amount)}
                    </Text>
                    {p.status === 'rejected' && p.reject_reason ? (
                      <Text variant="bodySmall" color={colors.danger}>
                        {p.reject_reason}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="label" color={st?.color ?? colors.textSecondary}>
                    {st?.label ?? p.status}
                  </Text>
                </View>
              );
            })}
          </Card>
        ) : null}

        {/* Alamat & catatan */}
        <Card>
          <Text variant="label" color={colors.textSecondary}>
            Alamat
          </Text>
          <Text variant="body">{order.address}</Text>
          {order.notes ? (
            <>
              <Text variant="label" color={colors.textSecondary} style={styles.mt}>
                Catatan
              </Text>
              <Text variant="body">{order.notes}</Text>
            </>
          ) : null}
        </Card>

        {/* Aksi bawah */}
        {provider?.whatsapp ? (
          <Button
            title="Chat Penyedia"
            variant="secondary"
            onPress={() => openWhatsApp(provider.whatsapp!, `Halo ${provider.name}, saya ingin menanyakan pesanan ${order.code}.`)}
            left={<Ionicons name="logo-whatsapp" size={18} color={colors.primary} />}
          />
        ) : null}
        {canUserCancel(order.payment_type as 'deposit' | 'upfront', status) ? (
          <Button title="Batalkan Pesanan" variant="danger" onPress={() => setCancelOpen(true)} />
        ) : null}
      </ScrollView>

      <Dialog
        visible={cancelOpen}
        title="Batalkan Pesanan?"
        message={
          hasApprovedPayment
            ? 'Dana akan dikembalikan oleh tim SiapBantu maksimal 1x24 jam hari kerja.'
            : 'Tindakan ini tidak bisa dibatalkan. Beri tahu kami alasannya.'
        }
        confirmLabel="Ya, Batalkan"
        cancelLabel="Kembali"
        confirmVariant="danger"
        loading={cancel.isPending}
        onConfirm={doCancel}
        onCancel={() => setCancelOpen(false)}
      >
        <Input
          label="Alasan"
          value={reason}
          onChangeText={setReason}
          placeholder="Mis. salah pilih jadwal"
          multiline
        />
      </Dialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerInfo: { flex: 1, gap: spacing.xs },
  cardTitle: { marginBottom: spacing.md },
  mt: { marginTop: spacing.sm },
  flex1: { flex: 1 },
  billHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  billItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  billLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  payItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
});
