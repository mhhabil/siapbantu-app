import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ProviderCard } from '@/components/ProviderCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useAllProviders, useAllServices } from '@/hooks/useCatalog';
import { haversineKm } from '@/lib/format';
import { colors, screenPadding, spacing } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const providers = useAllProviders();
  const services = useAllServices();

  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const results = useMemo(() => {
    if (!debounced) return [];
    const data = providers.data ?? [];
    const svc = services.data ?? [];
    const matchedByService = new Set(
      svc.filter((s) => s.name.toLowerCase().includes(debounced)).map((s) => s.provider_id)
    );
    return data
      .filter(
        (p) =>
          p.name.toLowerCase().includes(debounced) ||
          (p.categories?.name?.toLowerCase().includes(debounced) ?? false) ||
          matchedByService.has(p.id)
      )
      .map((p) => ({
        provider: p,
        dist:
          profile?.latitude != null && p.latitude != null
            ? haversineKm(profile.latitude, profile.longitude!, p.latitude, p.longitude!)
            : null,
      }));
  }, [debounced, providers.data, services.data, profile]);

  const loading = providers.isLoading || services.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Pencarian" />
      <View style={styles.controls}>
        <SearchBar value={term} onChangeText={setTerm} autoFocus />
      </View>

      {providers.isError ? (
        <ErrorState onRetry={() => providers.refetch()} />
      ) : loading && debounced ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !debounced ? (
        <EmptyState icon="search" title="Cari jasa, penyedia, atau kategori" />
      ) : results.length === 0 ? (
        <EmptyState icon="sad-outline" title="Tidak ditemukan" description="Coba kata kunci lain." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(x) => x.provider.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ProviderCard
              provider={item.provider}
              distanceKm={item.dist}
              onPress={() => router.push({ pathname: '/provider/[id]', params: { id: item.provider.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: screenPadding, paddingBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
});
