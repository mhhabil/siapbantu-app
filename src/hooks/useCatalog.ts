import { useQuery } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Category = Tables<'categories'>;
export type Provider = Tables<'providers'>;
export type Service = Tables<'services'>;
export type ProviderWithCategory = Provider & { categories: { name: string } | null };

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: ['category', id],
    enabled: !!id,
    queryFn: async (): Promise<Category | null> => {
      const { data, error } = await supabase.from('categories').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProvidersByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['providers', 'category', categoryId],
    enabled: !!categoryId,
    queryFn: async (): Promise<Provider[]> => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('category_id', categoryId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Semua penyedia + nama kategori — dipakai pencarian global. */
export function useAllProviders() {
  return useQuery({
    queryKey: ['providers', 'all'],
    queryFn: async (): Promise<ProviderWithCategory[]> => {
      const { data, error } = await supabase.from('providers').select('*, categories(name)');
      if (error) throw error;
      return (data as ProviderWithCategory[]) ?? [];
    },
  });
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: ['provider', id],
    enabled: !!id,
    queryFn: async (): Promise<{ provider: ProviderWithCategory; services: Service[] } | null> => {
      const { data: provider, error: pErr } = await supabase
        .from('providers')
        .select('*, categories(name)')
        .eq('id', id!)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!provider) return null;
      const { data: services, error: sErr } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', id!)
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (sErr) throw sErr;
      return { provider: provider as ProviderWithCategory, services: services ?? [] };
    },
  });
}

/** Nama jasa per provider — dipakai pencarian untuk mencocokkan kata kunci ke jasa. */
export function useAllServices() {
  return useQuery({
    queryKey: ['services', 'all'],
    queryFn: async (): Promise<Pick<Service, 'provider_id' | 'name'>[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('provider_id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });
}

/** Penyedia dari pesanan completed user, urut frekuensi, maks 3 (S04 "Sering Kamu Gunakan"). */
export function useFrequentProviders(userId: string | undefined) {
  return useQuery({
    queryKey: ['frequent_providers', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Provider[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('provider_id, providers(*)')
        .eq('user_id', userId!)
        .eq('status', 'completed');
      if (error) throw error;
      const counts = new Map<string, { count: number; provider: Provider }>();
      for (const row of (data ?? []) as { provider_id: string; providers: Provider | null }[]) {
        if (!row.providers) continue;
        const entry = counts.get(row.provider_id);
        if (entry) entry.count += 1;
        else counts.set(row.provider_id, { count: 1, provider: row.providers });
      }
      return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3).map((e) => e.provider);
    },
  });
}
