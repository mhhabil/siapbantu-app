import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { RupiahText } from '@/components/RupiahText';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useCatalog';
import { useOrder, useSubmitPayment } from '@/hooks/useOrders';
import { formatRupiah } from '@/lib/format';
import { pickImageFromLibrary, takePhoto } from '@/lib/image';
import { uploadImage } from '@/lib/storage';
import { colors, radius, screenPadding, spacing } from '@/theme';

type PayKind = 'deposit' | 'full' | 'settlement';

function resolveKind(status: string, paymentType: string): PayKind | null {
  if (status === 'awaiting_deposit') return 'deposit';
  if (status === 'awaiting_payment') return paymentType === 'upfront' ? 'full' : 'settlement';
  return null;
}

const TITLES: Record<PayKind, string> = {
  deposit: 'Transfer Deposit',
  full: 'Bayar Pesanan',
  settlement: 'Bayar Tagihan',
};

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();
  const query = useOrder(orderId);
  const settings = useAppSettings();
  const submit = useSubmitPayment();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Pembayaran" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (query.isError || !query.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Pembayaran" />
        <ErrorState onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  const { order, payments } = query.data;
  const kind = resolveKind(order.status, order.payment_type);
  const amount =
    kind === 'deposit' ? order.deposit_amount : order.amount_due ?? order.estimated_total;

  const lastRejected = payments.find((p) => p.status === 'rejected');
  const bank = settings.data;

  if (!kind) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Pembayaran" />
        <View style={styles.center}>
          <Text variant="body" color={colors.textSecondary} center>
            Tidak ada pembayaran yang perlu dilakukan saat ini.
          </Text>
          <Button
            title="Lihat Pesanan"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/order/[id]', params: { id: order.id } })}
            style={styles.mt}
          />
        </View>
      </SafeAreaView>
    );
  }

  async function copyAccount() {
    if (bank?.bank_account_number) {
      await Clipboard.setStringAsync(bank.bank_account_number);
      showToast('Nomor rekening disalin');
    }
  }

  async function onSend() {
    if (!photoUri || !session?.user || !kind) return;
    setUploading(true);
    setError(null);
    try {
      const path = `${session.user.id}/${order.id}/${Date.now()}.jpg`;
      await uploadImage('payment-proofs', path, photoUri);
      await submit.mutateAsync({ orderId: order.id, kind, proofPath: path });
      router.replace({ pathname: '/payment-submitted/[orderId]', params: { orderId: order.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim bukti pembayaran.');
    } finally {
      setUploading(false);
    }
  }

  async function pick(fromCamera: boolean) {
    const uri = fromCamera ? await takePhoto() : await pickImageFromLibrary();
    if (uri) setPhotoUri(uri);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={TITLES[kind]} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          Pesanan {order.code}
        </Text>
        <RupiahText value={amount} variant="display" color={colors.primary} />

        {kind === 'settlement' ? (
          <Card>
            <View style={styles.billRow}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Total tagihan
              </Text>
              <Text variant="bodySmall">{formatRupiah(order.final_total ?? 0)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Deposit dibayar
              </Text>
              <Text variant="bodySmall">−{formatRupiah(order.deposit_amount)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text variant="body">Sisa tagihan</Text>
              <RupiahText value={amount} variant="body" />
            </View>
            <Pressable onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}>
              <Text variant="bodySmall" color={colors.primary}>
                Lihat rincian
              </Text>
            </Pressable>
          </Card>
        ) : null}

        {lastRejected ? (
          <Card accentColor={colors.danger} style={styles.rejectCard}>
            <View style={styles.rejectHead}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <Text variant="label" color={colors.danger}>
                Pembayaran sebelumnya ditolak
              </Text>
            </View>
            <Text variant="bodySmall" color={colors.danger}>
              {lastRejected.reject_reason ?? 'Silakan unggah ulang bukti yang benar.'}
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text variant="label" color={colors.textSecondary}>
            Tujuan transfer
          </Text>
          <Text variant="h2">
            {bank?.bank_name ?? 'BCA'} {bank?.bank_account_number ?? '-'}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            a.n. {bank?.bank_account_name ?? 'SIAPBANTU'}
          </Text>
          <Button
            title="Salin Nomor Rekening"
            variant="secondary"
            onPress={copyAccount}
            left={<Ionicons name="copy-outline" size={18} color={colors.primary} />}
            style={styles.mt}
          />
        </Card>

        <View style={styles.uploadSection}>
          <Text variant="label" color={colors.textSecondary}>
            Upload Bukti Transfer
          </Text>
          {photoUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
              <Button title="Ganti Foto" variant="secondary" onPress={() => setPhotoUri(null)} style={styles.mt} />
            </View>
          ) : (
            <View style={styles.pickRow}>
              <Button
                title="Kamera"
                variant="secondary"
                onPress={() => pick(true)}
                left={<Ionicons name="camera" size={18} color={colors.primary} />}
                style={styles.pickBtn}
              />
              <Button
                title="Galeri"
                variant="secondary"
                onPress={() => pick(false)}
                left={<Ionicons name="image" size={18} color={colors.primary} />}
                style={styles.pickBtn}
              />
            </View>
          )}
        </View>

        {error ? (
          <Text variant="bodySmall" color={colors.danger}>
            {error}
          </Text>
        ) : null}

        <Button
          title="Kirim Bukti Pembayaran"
          onPress={onSend}
          disabled={!photoUri}
          loading={uploading || submit.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: screenPadding },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
  mt: { marginTop: spacing.sm },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  rejectCard: { gap: spacing.xs },
  rejectHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  uploadSection: { gap: spacing.sm },
  previewWrap: { gap: spacing.sm },
  preview: { width: '100%', height: 220, borderRadius: radius.card },
  pickRow: { flexDirection: 'row', gap: spacing.sm },
  pickBtn: { flex: 1 },
});
