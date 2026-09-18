import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type Payment = Tables<'payments'>;
export type OrderStatusLog = Tables<'order_status_logs'>;
export type Review = Tables<'reviews'>;

export type OrderProvider = Pick<
  Tables<'providers'>,
  'id' | 'name' | 'whatsapp' | 'payment_type' | 'deposit_amount' | 'logo_url'
>;

export type OrderDetail = {
  order: Order;
  items: OrderItem[];
  payments: Payment[];
  logs: OrderStatusLog[];
  provider: OrderProvider | null;
  review: Review | null;
};

/** Ringkasan pesanan untuk daftar (S11) & beranda (S04). */
export type OrderListItem = Order & {
  providers: { name: string; categories: { name: string } | null } | null;
};

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async (): Promise<OrderDetail | null> => {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*, providers(id, name, whatsapp, payment_type, deposit_amount, logo_url)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;
      const { providers, ...orderRow } = order as Order & { providers: OrderProvider | null };

      const [items, payments, logs, review] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', id!),
        supabase.from('payments').select('*').eq('order_id', id!).order('created_at', { ascending: false }),
        supabase.from('order_status_logs').select('*').eq('order_id', id!).order('created_at', { ascending: true }),
        supabase.from('reviews').select('*').eq('order_id', id!).maybeSingle(),
      ]);
      if (items.error) throw items.error;
      if (payments.error) throw payments.error;
      if (logs.error) throw logs.error;

      return {
        order: orderRow as Order,
        items: items.data ?? [],
        payments: payments.data ?? [],
        logs: logs.data ?? [],
        provider: providers ?? null,
        review: (review.data as Review | null) ?? null,
      };
    },
  });
}

/** Semua pesanan milik user (S11 & S04). */
export function useMyOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'mine', userId],
    enabled: !!userId,
    queryFn: async (): Promise<OrderListItem[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, providers(name, categories(name))')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as OrderListItem[]) ?? [];
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; reason: string }) => {
      const { error } = await supabase.rpc('cancel_order', {
        p_order_id: input.orderId,
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['order', v.orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; rating: number; comment?: string }) => {
      const { error } = await supabase.rpc('submit_review', {
        p_order_id: input.orderId,
        p_rating: input.rating,
        p_comment: input.comment ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['order', v.orderId] });
      qc.invalidateQueries({ queryKey: ['providers'] });
      qc.invalidateQueries({ queryKey: ['provider'] });
    },
  });
}

/** Langganan realtime: invalidate query saat baris pesanan/log/pembayaran berubah. */
export function useOrderRealtime(orderId: string | undefined) {
  const qc = useQueryClient();
  const uid = useId();
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-${orderId}-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => {
        qc.invalidateQueries({ queryKey: ['order', orderId] });
        qc.invalidateQueries({ queryKey: ['orders'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_logs', filter: `order_id=eq.${orderId}` }, () => {
        qc.invalidateQueries({ queryKey: ['order', orderId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `order_id=eq.${orderId}` }, () => {
        qc.invalidateQueries({ queryKey: ['order', orderId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, uid, qc]);
}

/** Langganan realtime untuk daftar pesanan milik user (beranda & tab pesanan). */
export function useMyOrdersRealtime(userId: string | undefined) {
  const qc = useQueryClient();
  const uid = useId();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`orders-user-${userId}-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ['orders', 'mine', userId] });
        qc.invalidateQueries({ queryKey: ['frequent_providers', userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, uid, qc]);
}

export type CreateOrderInput = {
  providerId: string;
  items: { service_id: string; estimated_qty: number }[];
  scheduledAt: string;
  notes?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<string> => {
      const { data, error } = await supabase.rpc('create_order', {
        p_provider_id: input.providerId,
        p_items: input.items,
        p_scheduled_at: input.scheduledAt,
        p_notes: input.notes ?? undefined,
        p_address: input.address ?? undefined,
        p_latitude: input.latitude ?? undefined,
        p_longitude: input.longitude ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSubmitPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; kind: 'deposit' | 'full' | 'settlement'; proofPath: string }) => {
      const { error } = await supabase.rpc('submit_payment', {
        p_order_id: input.orderId,
        p_kind: input.kind,
        p_proof_path: input.proofPath,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['order', v.orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
