import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { ProviderLogo } from '@/components/ProviderLogo';
import { Rating } from '@/components/Rating';
import { RupiahText } from '@/components/RupiahText';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Stepper } from '@/components/Stepper';
import { Text } from '@/components/Text';
import { useAuth } from '@/hooks/useAuth';
import { useProvider, type Service } from '@/hooks/useCatalog';
import { formatDistance, formatRupiah, formatTimeOnly, haversineKm } from '@/lib/format';
import { computeAvailability } from '@/lib/providerStatus';
import { openWhatsApp } from '@/lib/whatsapp';
import { colors, radius, screenPadding, spacing } from '@/theme';

function defaultQty(unit: string): number {
  return unit === 'kg' ? 1 : 1;
}
function stepFor(unit: string): number {
  return unit === 'kg' ? 0.5 : 1;
}

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const query = useProvider(id);
  const [selected, setSelected] = useState<Record<string, number>>({});

  const provider = query.data?.provider;
  const services = query.data?.services ?? [];
  const status = provider ? computeAvailability(provider) : null;

  const distance = useMemo(() => {
    if (!provider || profile?.latitude == null || provider.latitude == null) return null;
    return haversineKm(profile.latitude, profile.longitude!, provider.latitude, provider.longitude!);
  }, [provider, profile]);

  function toggle(service: Service) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[service.id] != null) {
        delete next[service.id];
        return next;
      }
      // Grup saling eksklusif: buang jasa lain di grup yang sama.
      if (service.service_group) {
        for (const s of services) {
          if (s.id !== service.id && s.service_group === service.service_group) delete next[s.id];
        }
      }
      next[service.id] = defaultQty(service.unit);
      return next;
    });
  }

  const selectedServices = services.filter((s) => selected[s.id] != null);
  const total = selectedServices.reduce((sum, s) => sum + Math.round(s.price * selected[s.id]!), 0);
  const hasKg = selectedServices.some((s) => s.unit === 'kg');
  const canContinue = selectedServices.length > 0 && !!status?.bookable;

  function onContinue() {
    if (!canContinue || !provider) return;
    const items = selectedServices.map((s) => ({
      service_id: s.id,
      name: s.name,
      unit: s.unit,
      price: s.price,
      qty: selected[s.id]!,
    }));
    router.push({
      pathname: '/checkout/[providerId]',
      params: { providerId: provider.id, items: JSON.stringify(items) },
    });
  }

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Penyedia" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (query.isError || !provider || !status) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Penyedia" />
        <ErrorState onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={provider.name} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header info */}
        <View style={styles.headerRow}>
          <ProviderLogo name={provider.name} logoUrl={provider.logo_url} size={64} />
          <View style={styles.headerInfo}>
            <Text variant="h2">{provider.name}</Text>
            <Rating avg={provider.rating_avg} count={provider.rating_count} />
            <View style={styles.metaRow}>
              <StatusBadge label={status.label} fg={status.fg} bg={status.bg} />
              {distance != null ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {formatDistance(distance)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {provider.open_time && provider.close_time ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            Jam buka {formatTimeOnly(provider.open_time)}–{formatTimeOnly(provider.close_time)} WIB
          </Text>
        ) : null}
        <Text variant="bodySmall" color={colors.textSecondary}>
          {provider.payment_type === 'deposit'
            ? `Deposit ${formatRupiah(provider.deposit_amount)}, sisanya setelah ditimbang`
            : 'Bayar di depan'}
        </Text>
        {provider.description ? (
          <Text variant="body" color={colors.textSecondary}>
            {provider.description}
          </Text>
        ) : null}

        {/* Daftar jasa */}
        <Text variant="h2" style={styles.sectionTitle}>
          Pilih Jasa
        </Text>
        {services.map((s) => {
          const isSelected = selected[s.id] != null;
          const isRadio = !!s.service_group;
          return (
            <Pressable
              key={s.id}
              onPress={() => toggle(s)}
              style={[styles.serviceRow, isSelected && styles.serviceSelected]}
            >
              <Ionicons
                name={
                  isRadio
                    ? isSelected
                      ? 'radio-button-on'
                      : 'radio-button-off'
                    : isSelected
                      ? 'checkbox'
                      : 'square-outline'
                }
                size={22}
                color={isSelected ? colors.primary : colors.textMuted}
              />
              <View style={styles.serviceInfo}>
                <Text variant="body">{s.name}</Text>
                {s.description ? (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {s.description}
                  </Text>
                ) : null}
                <Text variant="bodySmall" color={colors.primary}>
                  {formatRupiah(s.price)} / {s.unit}
                </Text>
                {isSelected ? (
                  <View style={styles.stepperWrap}>
                    <Stepper
                      value={selected[s.id]!}
                      step={stepFor(s.unit)}
                      unit={s.unit}
                      onChange={(v) => setSelected((prev) => ({ ...prev, [s.id]: v }))}
                    />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {hasKg ? (
          <Text variant="bodySmall" color={colors.warning} style={styles.kgNote}>
            Harga akhir mengikuti hasil timbang.
          </Text>
        ) : null}
      </ScrollView>

      {/* Footer sticky */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Estimasi
          </Text>
          <RupiahText value={total} variant="h2" />
        </View>
        <View style={styles.footerButtons}>
          <Button
            title="Chat Penjual"
            variant="secondary"
            onPress={() =>
              provider.whatsapp &&
              openWhatsApp(
                provider.whatsapp,
                `Halo ${provider.name}, saya dari SiapBantu ingin bertanya...`
              )
            }
            style={styles.chatBtn}
            left={<Ionicons name="logo-whatsapp" size={18} color={colors.primary} />}
          />
          <Button title="Lanjut" onPress={onContinue} disabled={!canContinue} style={styles.nextBtn} />
        </View>
        {!status.bookable ? (
          <Text variant="bodySmall" color={colors.danger} center style={styles.blockNote}>
            Penyedia sedang {status.label.toLowerCase()} — belum bisa dipesan.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.sm },
  headerRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  headerInfo: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sectionTitle: { marginTop: spacing.lg },
  serviceRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  serviceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  serviceInfo: { flex: 1, gap: spacing.xs },
  stepperWrap: { marginTop: spacing.sm },
  kgNote: { marginTop: spacing.sm },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  footerTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerButtons: { flexDirection: 'row', gap: spacing.sm },
  chatBtn: { flex: 1 },
  nextBtn: { flex: 1 },
  blockNote: { marginTop: -spacing.xs },
});
