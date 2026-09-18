import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/theme';

export default function PaymentSubmittedScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="hourglass-outline" size={56} color={colors.primary} />
        </View>
        <Text variant="h1" center>
          Pembayaran Sedang Diverifikasi
        </Text>
        <Text variant="body" color={colors.textSecondary} center>
          Terima kasih! Tim kami akan memverifikasi pembayaranmu maksimal 30 menit pada jam
          operasional. Kamu bisa memantau statusnya di halaman pesanan.
        </Text>
        <View style={styles.actions}>
          <Button
            title="Lihat Pesanan"
            onPress={() => router.replace({ pathname: '/order/[id]', params: { id: orderId } })}
          />
          <Button title="Kembali ke Beranda" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: screenPadding, gap: spacing.md },
  iconWrap: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
