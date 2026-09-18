import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { WaveHeader } from '@/components/WaveHeader';
import { maskPhone } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, radius, screenPadding, spacing, typography } from '@/theme';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  async function verify(token: string) {
    if (!phone) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setLoading(false);
    if (err) {
      setError('Kode salah, coba lagi');
      setCode('');
      return;
    }
    // Guard di root layout mengarahkan ke register / tabs sesuai profil.
  }

  function onChange(text: string) {
    const digits = text.replace(/[^\d]/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === OTP_LENGTH) verify(digits);
  }

  async function onResend() {
    if (countdown > 0 || !phone) return;
    setResending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    setResending(false);
    if (err) {
      setError(err.message || 'Gagal mengirim ulang kode.');
      return;
    }
    setCountdown(RESEND_SECONDS);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <WaveHeader title="Verifikasi" subtitle="Masukkan kode dari WhatsApp." />
      <View style={styles.body}>
        <Text variant="body" color={colors.textSecondary}>
          Kode dikirim ke WhatsApp {phone ? maskPhone(phone) : ''}
        </Text>

        <Pressable style={styles.cells} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.cell, i === code.length && styles.cellActive]}>
              <Text variant="h1">{code[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          style={styles.hiddenInput}
          caretHidden
        />

        {error ? (
          <Text variant="bodySmall" color={colors.danger} center>
            {error}
          </Text>
        ) : null}

        {loading ? (
          <Button title="Memverifikasi…" loading disabled onPress={() => {}} />
        ) : (
          <Button
            title="Verifikasi"
            onPress={() => verify(code)}
            disabled={code.length !== OTP_LENGTH}
          />
        )}

        <View style={styles.actions}>
          <Button
            title={countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang'}
            variant="ghost"
            onPress={onResend}
            disabled={countdown > 0}
            loading={resending}
          />
          <Button title="Ganti nomor" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: screenPadding, paddingTop: spacing.xxl, gap: spacing.lg },
  cells: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderWidth: 1.5, borderColor: colors.primary },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    ...typography.body,
  },
  actions: { flexDirection: 'row', justifyContent: 'center' },
});
