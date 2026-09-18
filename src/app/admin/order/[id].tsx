import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { RupiahText } from '@/components/RupiahText';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Stepper } from '@/components/Stepper';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { ORDER_STATUS, type OrderStatus } from '@/constants/orderStatus';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminOrder,
  useAdvanceStatus,
  useIssueBill,
  useVerifyPayment,
} from '@/hooks/useAdmin';
import { useCancelOrder } from '@/hooks/useOrders';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { getSignedUrl } from '@/lib/storage';
import { openWhatsApp } from '@/lib/whatsapp';
import { colors, radius, screenPadding, spacing } from '@/theme';

type PendingAction = {
  title: string;
  message?: string;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  requireReason?: boolean;
  run: (reason: string) => Promise<void>;
};

export default function AdminOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin, initializing } = useAuth();
  const { showToast } = useToast();
  const query = useAdminOrder(id);
  const verify = useVerifyPayment();
  const issueBill = useIssueBill();
  const advance = useAdvanceStatus();
  const cancel = useCancelOrder();

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');

  const data = query.data;
  const order = data?.order;
  const pendingPayment = data?.payments.find((p) => p.status === 'pending') ?? null;

  // Muat signed URL bukti pembayaran yang perlu diverifikasi.
  useEffect(() => {
    let active = true;
    if (pendingPayment?.proof_path) {
      getSignedUrl('payment-proofs', pendingPayment.proof_path).then((url) => {
        if (active) setProofUrl(url);
      });
    } else {
      setProofUrl(null);
    }
    return () => {
      active = false;
    };
  }, [pendingPayment?.proof_path]);

  // Inisialisasi form timbang dari estimasi.
  useEffect(() => {
    if (order?.status === 'on_the_way' && order.payment_type === 'deposit' && data) {
      setWeights((prev) =>
        Object.keys(prev).length ? prev : Object.fromEntries(data.items.map((it) => [it.id, Number(it.estimated_qty)]))
      );
    }
  }, [order?.status, order?.payment_type, data]);

  const billPreview = useMemo(() => {
    if (!data || !order) return { total: 0, due: 0 };
    const total = data.items.reduce((sum, it) => sum + Math.round(it.price * (weights[it.id] ?? Number(it.estimated_qty))), 0);
    return { total, due: total - order.deposit_amount };
  }, [data, order, weights]);

  if (query.isLoading || initializing) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Detail (Admin)" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Detail (Admin)" />
        <EmptyState icon="lock-closed-outline" title="Akses ditolak" />
      </SafeAreaView>
    );
  }
  if (query.isError || !data || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Detail (Admin)" />
        <ErrorState onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  const status = order.status as OrderStatus;
  const meta = ORDER_STATUS[status];
  const isDeposit = order.payment_type === 'deposit';

  async function runAction(a: PendingAction) {
    try {
      await a.run(reason.trim());
      showToast('Berhasil');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setAction(null);
      setReason('');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={order.code} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text variant="h2">{data.provider?.name ?? 'Penyedia'}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {data.user?.full_name ?? 'User'} · {data.user?.phone ?? '-'}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Jadwal: {formatDateTime(order.scheduled_at)}
            </Text>
          </View>
          <StatusBadge label={meta.label} fg={meta.fg} bg={meta.bg} />
        </View>

        {data.user?.phone ? (
          <Button
            title="Chat User"
            variant="secondary"
            onPress={() => openWhatsApp(data.user!.phone!, `Halo, terkait pesanan ${order.code} di SiapBantu.`)}
            left={<Ionicons name="logo-whatsapp" size={18} color={colors.primary} />}
          />
        ) : null}

        {/* Verifikasi pembayaran */}
        {(status === 'verifying_deposit' || status === 'verifying_payment') && pendingPayment ? (
          <Card>
            <Text variant="h2" style={styles.cardTitle}>
              Verifikasi Pembayaran
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {formatRupiah(pendingPayment.amount)} · {pendingPayment.kind}
            </Text>
            {proofUrl ? (
              <Pressable onPress={() => setViewer(true)}>
                <Image source={{ uri: proofUrl }} style={styles.proof} contentFit="cover" />
                <Text variant="bodySmall" color={colors.primary} style={styles.mt}>
                  Ketuk untuk perbesar
                </Text>
              </Pressable>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
            <View style={styles.actionsRow}>
              <Button
                title="Tolak"
                variant="danger"
                style={styles.flex1}
                onPress={() =>
                  setAction({
                    title: 'Tolak Pembayaran',
                    confirmLabel: 'Tolak',
                    variant: 'danger',
                    requireReason: true,
                    run: (r) =>
                      verify.mutateAsync({ paymentId: pendingPayment.id, approve: false, rejectReason: r, orderId: order.id }),
                  })
                }
              />
              <Button
                title="Setujui"
                style={styles.flex1}
                onPress={() =>
                  setAction({
                    title: 'Setujui Pembayaran',
                    message: 'Pastikan nominal & bukti sesuai.',
                    confirmLabel: 'Setujui',
                    run: () => verify.mutateAsync({ paymentId: pendingPayment.id, approve: true, orderId: order.id }),
                  })
                }
              />
            </View>
          </Card>
        ) : null}

        {/* Konfirmasi penyedia */}
        {status === 'awaiting_provider' ? (
          <Card accentColor={colors.info}>
            <Text variant="body">Terima pesanan mewakili penyedia?</Text>
            <Button
              title="Terima (Penyedia berangkat)"
              style={styles.mt}
              onPress={() =>
                setAction({
                  title: 'Terima Pesanan',
                  confirmLabel: 'Terima',
                  run: () => advance.mutateAsync({ orderId: order.id, nextStatus: 'on_the_way', note: 'Penyedia berangkat' }),
                })
              }
            />
          </Card>
        ) : null}

        {/* Input hasil timbang (deposit) */}
        {status === 'on_the_way' && isDeposit ? (
          <Card>
            <Text variant="h2" style={styles.cardTitle}>
              Input Hasil Timbang / Jumlah Aktual
            </Text>
            {data.items.map((it) => (
              <View key={it.id} style={styles.weighRow}>
                <View style={styles.flex1}>
                  <Text variant="body">{it.service_name}</Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {formatRupiah(it.price)} / {it.unit}
                  </Text>
                </View>
                <Stepper
                  value={weights[it.id] ?? Number(it.estimated_qty)}
                  step={it.unit === 'kg' ? 0.5 : 1}
                  min={0}
                  unit={it.unit}
                  onChange={(v) => setWeights((prev) => ({ ...prev, [it.id]: v }))}
                />
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.billLine}>
              <Text variant="body">Total</Text>
              <RupiahText value={billPreview.total} variant="body" />
            </View>
            <View style={styles.billLine}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Deposit dibayar
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                −{formatRupiah(order.deposit_amount)}
              </Text>
            </View>
            <View style={styles.billLine}>
              <Text variant="body">Sisa Tagihan</Text>
              <RupiahText value={Math.max(0, billPreview.due)} variant="h2" />
            </View>
            <Button
              title="Terbitkan Tagihan"
              style={styles.mt}
              onPress={() =>
                setAction({
                  title: 'Terbitkan Tagihan',
                  message: `Total ${formatRupiah(billPreview.total)}, sisa ${formatRupiah(Math.max(0, billPreview.due))}.`,
                  confirmLabel: 'Terbitkan',
                  run: () =>
                    issueBill.mutateAsync({
                      orderId: order.id,
                      items: data.items.map((it) => ({ order_item_id: it.id, final_qty: weights[it.id] ?? Number(it.estimated_qty) })),
                    }),
                })
              }
            />
          </Card>
        ) : null}

        {/* Mulai dikerjakan (upfront) */}
        {status === 'on_the_way' && !isDeposit ? (
          <Button
            title="Mulai Dikerjakan"
            onPress={() =>
              setAction({
                title: 'Mulai Dikerjakan',
                confirmLabel: 'Mulai',
                run: () => advance.mutateAsync({ orderId: order.id, nextStatus: 'in_progress' }),
              })
            }
          />
        ) : null}

        {/* In progress / delivering */}
        {status === 'in_progress' ? (
          <View style={styles.actionsRow}>
            <Button
              title="Antar"
              variant="secondary"
              style={styles.flex1}
              onPress={() =>
                setAction({ title: 'Antar Pesanan', confirmLabel: 'Antar', run: () => advance.mutateAsync({ orderId: order.id, nextStatus: 'delivering' }) })
              }
            />
            <Button
              title="Selesai"
              style={styles.flex1}
              onPress={() =>
                setAction({ title: 'Selesaikan Pesanan', confirmLabel: 'Selesai', run: () => advance.mutateAsync({ orderId: order.id, nextStatus: 'completed' }) })
              }
            />
          </View>
        ) : null}
        {status === 'delivering' ? (
          <Button
            title="Selesai"
            onPress={() =>
              setAction({ title: 'Selesaikan Pesanan', confirmLabel: 'Selesai', run: () => advance.mutateAsync({ orderId: order.id, nextStatus: 'completed' }) })
            }
          />
        ) : null}

        {/* Rincian item */}
        <Card>
          <Text variant="h2" style={styles.cardTitle}>
            Item
          </Text>
          {data.items.map((it) => {
            const qty = order.final_total != null ? it.final_qty ?? it.estimated_qty : it.estimated_qty;
            return (
              <View key={it.id} style={styles.billLine}>
                <Text variant="body" style={styles.flex1}>
                  {it.service_name}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {String(qty).replace('.', ',')} {it.unit}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Batalkan */}
        {status !== 'completed' && status !== 'cancelled' ? (
          <Button
            title="Batalkan Pesanan"
            variant="danger"
            onPress={() =>
              setAction({
                title: 'Batalkan Pesanan',
                confirmLabel: 'Batalkan',
                variant: 'danger',
                requireReason: true,
                run: (r) => cancel.mutateAsync({ orderId: order.id, reason: r }),
              })
            }
          />
        ) : null}
      </ScrollView>

      {/* Dialog aksi */}
      <Dialog
        visible={!!action}
        title={action?.title ?? ''}
        message={action?.message}
        confirmLabel={action?.confirmLabel ?? 'Ya'}
        confirmVariant={action?.variant ?? 'primary'}
        loading={verify.isPending || issueBill.isPending || advance.isPending || cancel.isPending}
        onCancel={() => {
          setAction(null);
          setReason('');
        }}
        onConfirm={() => {
          if (action?.requireReason && reason.trim().length === 0) return;
          if (action) runAction(action);
        }}
      >
        {action?.requireReason ? (
          <Input label="Alasan" value={reason} onChangeText={setReason} placeholder="Wajib diisi" multiline />
        ) : null}
      </Dialog>

      {/* Zoom bukti */}
      <Modal visible={viewer} transparent onRequestClose={() => setViewer(false)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(false)}>
          {proofUrl ? <Image source={{ uri: proofUrl }} style={styles.viewerImg} contentFit="contain" /> : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex1: { flex: 1, gap: 2 },
  cardTitle: { marginBottom: spacing.sm },
  mt: { marginTop: spacing.sm },
  proof: { width: '100%', height: 260, borderRadius: radius.card, marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  weighRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  billLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
});
