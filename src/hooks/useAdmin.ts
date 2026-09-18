import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { OrderDetail } from './useOrders';

export type AdminOrderRow = Tables<'orders'> & {
  providers: { name: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

export type AdminOrderDetail = OrderDetail & {
  user: { full_name: string | null; phone: string | null } | null;
};

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async (): Promise<AdminOrderRow[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, providers(name), profiles!orders_user_id_fkey(full_name, phone)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data as AdminOrderRow[]) ?? [];
    },
  });
}

export function useAdminOrdersRealtime() {
  const qc = useQueryClient();
  const uid = useId();
  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'order', id],
    enabled: !!id,
    queryFn: async (): Promise<AdminOrderDetail | null> => {
      const { data: order, error } = await supabase
        .from('orders')
        .select(
          '*, providers(id, name, whatsapp, payment_type, deposit_amount, logo_url), profiles!orders_user_id_fkey(full_name, phone)'
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;
      const { providers, profiles, ...orderRow } = order as any;

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
        order: orderRow,
        items: items.data ?? [],
        payments: payments.data ?? [],
        logs: logs.data ?? [],
        provider: providers ?? null,
        review: (review.data as AdminOrderDetail['review']) ?? null,
        user: profiles ?? null,
      };
    },
  });
}

function useAdminMutation<TVars>(fn: (v: TVars) => Promise<void>, orderIdOf: (v: TVars) => string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      const id = orderIdOf(v);
      qc.invalidateQueries({ queryKey: ['admin', 'order', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useVerifyPayment() {
  return useAdminMutation<{ paymentId: string; approve: boolean; rejectReason?: string; orderId: string }>(
    async (v) => {
      const { error } = await supabase.rpc('admin_verify_payment', {
        p_payment_id: v.paymentId,
        p_approve: v.approve,
        p_reject_reason: v.rejectReason ?? undefined,
      });
      if (error) throw error;
    },
    (v) => v.orderId
  );
}

export function useIssueBill() {
  return useAdminMutation<{ orderId: string; items: { order_item_id: string; final_qty: number }[] }>(
    async (v) => {
      const { error } = await supabase.rpc('admin_issue_bill', { p_order_id: v.orderId, p_items: v.items });
      if (error) throw error;
    },
    (v) => v.orderId
  );
}

export function useAdvanceStatus() {
  return useAdminMutation<{ orderId: string; nextStatus: string; note?: string }>(
    async (v) => {
      const { error } = await supabase.rpc('admin_advance_status', {
        p_order_id: v.orderId,
        p_next_status: v.nextStatus,
        p_note: v.note ?? undefined,
      });
      if (error) throw error;
    },
    (v) => v.orderId
  );
}
