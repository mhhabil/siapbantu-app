-- SiapBantu — Hardening: cabut EXECUTE default (PUBLIC/anon) dari fungsi.
-- Helper internal (gen_order_code, log_status, trigger fn) tidak boleh dipanggil
-- langsung sebagai RPC; dipanggil dari dalam fungsi security definer (jalan sebagai owner).

revoke execute on function public.gen_order_code() from public, anon;
revoke execute on function public.gen_order_code() from authenticated;
revoke execute on function public.log_status(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.prevent_role_change() from public, anon;
revoke execute on function public.refresh_provider_rating() from public, anon;
revoke execute on function public.create_order(uuid, jsonb, timestamptz, text, text, double precision, double precision) from public, anon;
revoke execute on function public.submit_payment(uuid, text, text) from public, anon;
revoke execute on function public.cancel_order(uuid, text) from public, anon;
revoke execute on function public.submit_review(uuid, int, text) from public, anon;
revoke execute on function public.admin_verify_payment(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_issue_bill(uuid, jsonb) from public, anon;
revoke execute on function public.admin_advance_status(uuid, text, text) from public, anon;
revoke execute on function public.is_admin() from public, anon;

-- RPC yang dipanggil dari client oleh user login:
grant execute on function public.create_order(uuid, jsonb, timestamptz, text, text, double precision, double precision) to authenticated;
grant execute on function public.submit_payment(uuid, text, text) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.submit_review(uuid, int, text) to authenticated;
grant execute on function public.admin_verify_payment(uuid, boolean, text) to authenticated;
grant execute on function public.admin_issue_bill(uuid, jsonb) to authenticated;
grant execute on function public.admin_advance_status(uuid, text, text) to authenticated;
-- is_admin() dipakai di dalam RLS policy → authenticated wajib bisa eksekusi.
grant execute on function public.is_admin() to authenticated;
