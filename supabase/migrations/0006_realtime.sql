-- SiapBantu — Aktifkan Supabase Realtime untuk pelacakan status pesanan.
-- RLS tetap berlaku: user hanya menerima perubahan baris miliknya.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_logs;
alter publication supabase_realtime add table public.payments;
