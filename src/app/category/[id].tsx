import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ProviderCard } from '@/components/ProviderCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { useCategory, useProvidersByCategory, type Provider } from '@/hooks/useCatalog';
import { useAuth } from '@/hooks/useAuth';
import { haversineKm } from '@/lib/format';
import { computeAvailability } from '@/lib/providerStatus';
import { colors, screenPadding, spacing } from '@/theme';

type SortMode = 'distance' | 'rating';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const category = useCategory(id);
  const providers = useProvidersByCategory(id);

  const hasLocation = profile?.latitude != null && profile?.longitude != null;
  const [sort, setSort] = useState<SortMode>(hasLocation ? 'distance' : 'rating');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const data = providers.data ?? [];
    const withMeta = data.map((p) => ({
      provider: p,
      dist:
        hasLocation && p.latitude != null && p.longitude != null
          ? haversineKm(profile!.latitude!, profile!.longitude!, p.latitude, p.longitude)
          : null,
      bookable: computeAvailability(p).bookable,
    }));
    const filtered = search.trim()
      ? withMeta.filter((x) => x.provider.name.toLowerCase().includes(search.trim().toLowerCase()))
      : withMeta;
    return filtered.sort((a, b) => {
      if (a.bookable !== b.bookable) return a.bookable ? -1 : 1;
      if (sort === 'distance' && a.dist != null && b.dist != null) return a.dist - b.dist;
      return b.provider.rating_avg - a.provider.rating_avg;
    });
  }, [providers.data, search, sort, hasLocation, profile]);

  function openProvider(p: Provider) {
    router.push({ pathname: '/provider/[id]', params: { id: p.id } });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={`Kategori: ${category.data?.name ?? ''}`} />
      <View style={styles.controls}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Cari penyedia di kategori ini…"
        />
        <View style={styles.chips}>
          <Chip label="Terdekat" active={sort === 'distance'} onPress={() => setSort('distance')} />
          <Chip label="Rating Tertinggi" active={sort === 'rating'} onPress={() => setSort('rating')} />
        </View>
      </View>

      {providers.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : providers.isError ? (
        <ErrorState onRetry={() => providers.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title={search ? 'Tidak ditemukan' : 'Belum ada penyedia di kategori ini'}
          description={search ? 'Coba kata kunci lain.' : undefined}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(x) => x.provider.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item.provider}
              distanceKm={item.dist}
              onPress={() => openProvider(item.provider)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: screenPadding, gap: spacing.md, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
});
