import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { RupiahText } from '@/components/RupiahText';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useProvider } from '@/hooks/useCatalog';
import { useCreateOrder } from '@/hooks/useOrders';
import { buildScheduledIso, formatRupiah, wibYmd } from '@/lib/format';
import { colors, screenPadding, spacing } from '@/theme';

type DraftItem = { service_id: string; name: string; unit: string; price: number; qty: number };

const DATE_OPTIONS = [
  { offset: 0, label: 'Hari ini' },
  { offset: 1, label: 'Besok' },
  { offset: 2, label: 'Lusa' },
];

export default function CheckoutScreen() {
  const { providerId, items: itemsParam } = useLocalSearchParams<{ providerId: string; items: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const providerQuery = useProvider(providerId);
  const createOrder = useCreateOrder();

  const provider = providerQuery.data?.provider;
  const items = useMemo<DraftItem[]>(() => {
    try {
      return itemsParam ? JSON.parse(itemsParam) : [];
    } catch {
      return [];
    }
  }, [itemsParam]);

  const total = items.reduce((sum, it) => sum + Math.round(it.price * it.qty), 0);

  const slots = useMemo(() => {
    const openH = provider?.open_time ? parseInt(provider.open_time.slice(0, 2), 10) : 8;
    const closeH = provider?.close_time ? parseInt(provider.close_time.slice(0, 2), 10) : 17;
    const arr: number[] = [];
    for (let h = openH; h <= closeH; h++) arr.push(h);
    return arr.length ? arr : [8, 9, 10];
  }, [provider]);

  const [address, setAddress] = useState(profile?.address ?? '');
  const [dateOffset, setDateOffset] = useState(0);
  const [hour, setHour] = useState<number>(slots[0] ?? 9);
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeposit = provider?.payment_type === 'deposit';
  const valid = address.trim().length > 0 && items.length > 0;

  async function submit() {
    if (!provider) return;
    setError(null);
    try {
      const scheduledAt = buildScheduledIso(wibYmd(dateOffset), hour);
      const orderId = await createOrder.mutateAsync({
        providerId: provider.id,
        items: items.map((it) => ({ service_id: it.service_id, estimated_qty: it.qty })),
        scheduledAt,
        notes: notes.trim() || null,
        address: address.trim(),
        latitude: profile?.latitude ?? null,
        longitude: profile?.longitude ?? null,
      });
      setConfirmOpen(false);
      router.replace({ pathname: '/payment/[orderId]', params: { orderId } });
    } catch (e) {
      setConfirmOpen(false);
      setError(e instanceof Error ? e.message : 'Gagal membuat pesanan.');
      showToast('Gagal membuat pesanan', 'error');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Ringkasan Pesanan" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Alamat" value={address} onChangeText={setAddress} multiline style={styles.multiline} />

        <View>
          <Text variant="label" color={colors.textSecondary}>
            Tanggal
          </Text>
          <View style={styles.chips}>
            {DATE_OPTIONS.map((d) => (
              <Chip key={d.offset} label={d.label} active={dateOffset === d.offset} onPress={() => setDateOffset(d.offset)} />
            ))}
          </View>
        </View>

        <View>
          <Text variant="label" color={colors.textSecondary}>
            Jam
          </Text>
          <View style={styles.chips}>
            {slots.map((h) => (
              <Chip key={h} label={`${String(h).padStart(2, '0')}.00`} active={hour === h} onPress={() => setHour(h)} />
            ))}
          </View>
        </View>

        <Input
          label="Catatan (opsional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Mis. tolong dijemput pagi"
          multiline
          style={styles.multiline}
        />

        <Card>
          <Text variant="h2">Rincian</Text>
          {items.map((it) => (
            <View key={it.service_id} style={styles.itemRow}>
              <Text variant="body" style={styles.itemName}>
                {it.name}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {String(it.qty).replace('.', ',')} {it.unit} × {formatRupiah(it.price)}
              </Text>
              <RupiahText value={Math.round(it.price * it.qty)} variant="body" />
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text variant="body">Estimasi total</Text>
            <RupiahText value={total} variant="h2" />
          </View>
        </Card>

        <Card accentColor={colors.info}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {isDeposit
              ? `Bayar deposit ${formatRupiah(provider?.deposit_amount ?? 0)} sekarang. Sisa tagihan dibayar setelah ditimbang. Deposit akan dipotong dari total tagihan.`
              : `Bayar ${formatRupiah(total)} sekarang.`}
          </Text>
        </Card>

        {error ? (
          <Text variant="bodySmall" color={colors.danger}>
            {error}
          </Text>
        ) : null}

        <Button
          title="Buat Pesanan"
          onPress={() => setConfirmOpen(true)}
          disabled={!valid}
          loading={createOrder.isPending}
        />
      </ScrollView>

      <Dialog
        visible={confirmOpen}
        title="Konfirmasi Pesanan"
        message={
          isDeposit
            ? `Kamu akan membayar deposit ${formatRupiah(provider?.deposit_amount ?? 0)}. Sisa tagihan menyusul setelah ditimbang.`
            : `Kamu akan membayar ${formatRupiah(total)} setelah pesanan dibuat.`
        }
        confirmLabel="Ya, Buat Pesanan"
        cancelLabel="Batal"
        loading={createOrder.isPending}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  itemRow: { marginTop: spacing.sm, gap: 2 },
  itemName: { fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
