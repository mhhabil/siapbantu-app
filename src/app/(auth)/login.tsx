import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { WaveHeader } from '@/components/WaveHeader';
import { isValidIndoPhone, toE164 } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, screenPadding, spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidIndoPhone(phone);

  async function onSubmit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    const e164 = toE164(phone);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (err) {
      setError(err.message || 'Gagal mengirim OTP. Coba lagi.');
      return;
    }
    router.push({ pathname: '/otp', params: { phone: e164 } });
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <WaveHeader title="SiapBantu" subtitle="Masuk untuk mulai pakai jasa." />
          <View style={styles.body}>
            <Text variant="h2">Masuk / Daftar</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Masukkan nomor WhatsApp, kami kirim kode verifikasi.
            </Text>
            <Input
              label="Nomor WhatsApp"
              keyboardType="number-pad"
              placeholder="8123456789"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^\d]/g, ''))}
              maxLength={13}
              prefix={
                <Text variant="body" color={colors.textSecondary}>
                  +62
                </Text>
              }
              error={error ?? undefined}
            />
            <Button title="Masuk" onPress={onSubmit} disabled={!valid} loading={loading} />
            <Text variant="bodySmall" color={colors.textSecondary} center style={styles.hint}>
              Belum punya akun? Masukkan nomormu — kami buatkan otomatis lewat OTP.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  body: { paddingHorizontal: screenPadding, paddingTop: spacing.xxl, gap: spacing.md },
  hint: { marginTop: spacing.sm },
});
