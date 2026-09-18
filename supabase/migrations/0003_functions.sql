-- SiapBantu — RPC & trigger (REQUIREMENTS Bagian 6 & 5).
-- Semua logika uang/status di sini (security definer), bukan di client.

-- Kode pesanan unik: SB-YYMMDD-XXXX -----------------------------------------
create or replace function public.gen_order_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_try int := 0;
begin
  loop
    v_code := 'SB-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-'
      || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    exit when not exists (select 1 from public.orders where code = v_code);
    v_try := v_try + 1;
    if v_try > 25 then raise exception 'Gagal membuat kode pesanan'; end if;
  end loop;
  return v_code;
end;
$$;

-- Helper log status + updated_at --------------------------------------------
create or replace function public.log_status(
  p_order_id uuid, p_status text, p_note text, p_actor uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.order_status_logs (order_id, status, note, created_by)
  values (p_order_id, p_status, p_note, p_actor);
$$;

-- create_order ---------------------------------------------------------------
create or replace function public.create_order(
  p_provider_id uuid,
  p_items jsonb,
  p_scheduled_at timestamptz,
  p_notes text default null,
  p_address text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_provider public.providers;
  v_profile public.profiles;
  v_now_wib time;
  v_item jsonb;
  v_service public.services;
  v_qty numeric(6, 2);
  v_subtotal int;
  v_est_total int := 0;
  v_order_id uuid;
  v_code text;
  v_status text;
  v_groups text[] := '{}';
begin
  if v_user is null then raise exception 'Harus login'; end if;

  select * into v_provider from public.providers where id = p_provider_id;
  if not found then raise exception 'Penyedia tidak ditemukan'; end if;
  if not v_provider.is_available then raise exception 'Penyedia sedang tidak tersedia'; end if;

  if v_provider.open_time is not null and v_provider.close_time is not null then
    v_now_wib := (now() at time zone 'Asia/Jakarta')::time;
    if not (v_now_wib between v_provider.open_time and v_provider.close_time) then
      raise exception 'Penyedia sedang tutup';
    end if;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Pilih minimal satu jasa';
  end if;

  select * into v_profile from public.profiles where id = v_user;

  v_status := case when v_provider.payment_type = 'deposit'
                   then 'awaiting_deposit' else 'awaiting_payment' end;
  v_code := public.gen_order_code();

  insert into public.orders (
    code, user_id, provider_id, payment_type, status, address, latitude, longitude,
    scheduled_at, notes, deposit_amount, estimated_total, amount_due
  ) values (
    v_code, v_user, p_provider_id, v_provider.payment_type, v_status,
    coalesce(p_address, v_profile.address, ''),
    coalesce(p_latitude, v_profile.latitude),
    coalesce(p_longitude, v_profile.longitude),
    p_scheduled_at, p_notes,
    case when v_provider.payment_type = 'deposit' then v_provider.deposit_amount else 0 end,
    0, null
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_service
      from public.services
      where id = (v_item->>'service_id')::uuid and provider_id = p_provider_id and is_active;
    if not found then raise exception 'Jasa tidak valid'; end if;

    v_qty := (v_item->>'estimated_qty')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'Jumlah tidak valid'; end if;

    if v_service.service_group is not null then
      if v_service.service_group = any (v_groups) then
        raise exception 'Hanya boleh memilih satu jasa per grup';
      end if;
      v_groups := array_append(v_groups, v_service.service_group);
    end if;

    v_subtotal := round(v_service.price * v_qty)::int;
    v_est_total := v_est_total + v_subtotal;

    insert into public.order_items (
      order_id, service_id, service_name, unit, price, estimated_qty, subtotal
    ) values (
      v_order_id, v_service.id, v_service.name, v_service.unit, v_service.price, v_qty, v_subtotal
    );
  end loop;

  update public.orders set
    estimated_total = v_est_total,
    amount_due = case when v_provider.payment_type = 'upfront' then v_est_total else null end
  where id = v_order_id;

  perform public.log_status(v_order_id, v_status, 'Pesanan dibuat', v_user);
  return v_order_id;
end;
$$;

-- submit_payment -------------------------------------------------------------
create or replace function public.submit_payment(
  p_order_id uuid, p_kind text, p_proof_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_amount int;
  v_next text;
  v_payment_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.user_id <> v_user then raise exception 'Bukan pesananmu'; end if;

  if p_kind = 'deposit' then
    if v_order.status <> 'awaiting_deposit' or v_order.payment_type <> 'deposit' then
      raise exception 'Status tidak sesuai untuk pembayaran deposit';
    end if;
    v_amount := v_order.deposit_amount;
    v_next := 'verifying_deposit';
  elsif p_kind = 'full' then
    if v_order.status <> 'awaiting_payment' or v_order.payment_type <> 'upfront' then
      raise exception 'Status tidak sesuai untuk pembayaran';
    end if;
    v_amount := coalesce(v_order.amount_due, v_order.estimated_total);
    v_next := 'verifying_payment';
  elsif p_kind = 'settlement' then
    if v_order.status <> 'awaiting_payment' or v_order.payment_type <> 'deposit' then
      raise exception 'Status tidak sesuai untuk pelunasan';
    end if;
    v_amount := coalesce(v_order.amount_due, 0);
    v_next := 'verifying_payment';
  else
    raise exception 'Jenis pembayaran tidak dikenal';
  end if;

  insert into public.payments (order_id, kind, amount, proof_path, status)
  values (p_order_id, p_kind, v_amount, p_proof_path, 'pending')
  returning id into v_payment_id;

  update public.orders set status = v_next, updated_at = now() where id = p_order_id;
  perform public.log_status(p_order_id, v_next, 'Bukti pembayaran dikirim', v_user);
  return v_payment_id;
end;
$$;

-- cancel_order ---------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_is_admin boolean := public.is_admin();
  v_allowed boolean;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Alasan pembatalan wajib diisi';
  end if;

  if v_is_admin then
    v_allowed := v_order.status not in ('completed', 'cancelled');
  else
    if v_order.user_id <> v_user then raise exception 'Bukan pesananmu'; end if;
    -- Aturan 5.4
    if v_order.payment_type = 'deposit' then
      v_allowed := v_order.status in ('awaiting_deposit', 'verifying_deposit', 'awaiting_provider');
    else
      v_allowed := v_order.status in
        ('awaiting_payment', 'verifying_payment', 'awaiting_provider');
    end if;
  end if;

  if not v_allowed then raise exception 'Pesanan tidak bisa dibatalkan pada status ini'; end if;

  update public.orders
    set status = 'cancelled', cancel_reason = p_reason, updated_at = now()
    where id = p_order_id;
  perform public.log_status(p_order_id, 'cancelled', p_reason, coalesce(v_user, null));
end;
$$;

-- admin_verify_payment -------------------------------------------------------
create or replace function public.admin_verify_payment(
  p_payment_id uuid, p_approve boolean, p_reject_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_payment public.payments;
  v_order public.orders;
  v_next text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;

  select * into v_payment from public.payments where id = p_payment_id;
  if not found then raise exception 'Pembayaran tidak ditemukan'; end if;
  if v_payment.status <> 'pending' then raise exception 'Pembayaran sudah diproses'; end if;

  select * into v_order from public.orders where id = v_payment.order_id;

  if p_approve then
    update public.payments set status = 'approved', verified_by = v_user, verified_at = now()
      where id = p_payment_id;
    v_next := case
      when v_payment.kind = 'deposit' then 'awaiting_provider'
      when v_payment.kind = 'full' then 'awaiting_provider'
      when v_payment.kind = 'settlement' then 'in_progress'
    end;
    update public.orders set status = v_next, updated_at = now() where id = v_order.id;
    perform public.log_status(v_order.id, v_next, 'Pembayaran disetujui', v_user);
  else
    if p_reject_reason is null or length(trim(p_reject_reason)) = 0 then
      raise exception 'Alasan penolakan wajib diisi';
    end if;
    update public.payments
      set status = 'rejected', reject_reason = p_reject_reason,
          verified_by = v_user, verified_at = now()
      where id = p_payment_id;
    v_next := case
      when v_payment.kind = 'deposit' then 'awaiting_deposit'
      else 'awaiting_payment'
    end;
    update public.orders set status = v_next, updated_at = now() where id = v_order.id;
    perform public.log_status(v_order.id, v_next, 'Pembayaran ditolak: ' || p_reject_reason, v_user);
  end if;
end;
$$;

-- admin_issue_bill -----------------------------------------------------------
create or replace function public.admin_issue_bill(p_order_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_item jsonb;
  v_oi public.order_items;
  v_final_qty numeric(6, 2);
  v_subtotal int;
  v_final_total int := 0;
  v_amount_due int;
  v_next text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.payment_type <> 'deposit' then raise exception 'Tagihan hanya untuk tipe deposit'; end if;
  if v_order.status <> 'on_the_way' then raise exception 'Status tidak sesuai untuk terbitkan tagihan'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_oi from public.order_items
      where id = (v_item->>'order_item_id')::uuid and order_id = p_order_id;
    if not found then raise exception 'Item tidak valid'; end if;
    v_final_qty := (v_item->>'final_qty')::numeric;
    if v_final_qty is null or v_final_qty < 0 then raise exception 'Jumlah akhir tidak valid'; end if;
    v_subtotal := round(v_oi.price * v_final_qty)::int;
    v_final_total := v_final_total + v_subtotal;
    update public.order_items set final_qty = v_final_qty, subtotal = v_subtotal where id = v_oi.id;
  end loop;

  v_amount_due := v_final_total - v_order.deposit_amount;
  v_next := case when v_amount_due <= 0 then 'in_progress' else 'awaiting_payment' end;

  update public.orders
    set final_total = v_final_total, amount_due = v_amount_due, status = v_next, updated_at = now()
    where id = p_order_id;
  perform public.log_status(p_order_id, v_next,
    'Tagihan terbit: total ' || v_final_total || ', sisa ' || v_amount_due, v_user);
end;
$$;

-- admin_advance_status -------------------------------------------------------
create or replace function public.admin_advance_status(
  p_order_id uuid, p_next_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_ok boolean;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  v_ok := (v_order.status, p_next_status) in (
    ('awaiting_provider', 'on_the_way'),
    ('on_the_way', 'in_progress'),
    ('on_the_way', 'delivering'),
    ('in_progress', 'delivering'),
    ('in_progress', 'completed'),
    ('delivering', 'completed')
  );
  if not v_ok then raise exception 'Transisi status tidak valid'; end if;

  update public.orders set status = p_next_status, updated_at = now() where id = p_order_id;
  perform public.log_status(p_order_id, p_next_status, p_note, v_user);
end;
$$;

-- submit_review --------------------------------------------------------------
create or replace function public.submit_review(
  p_order_id uuid, p_rating int, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.user_id <> v_user then raise exception 'Bukan pesananmu'; end if;
  if v_order.status <> 'completed' then raise exception 'Hanya pesanan selesai yang bisa diulas'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating 1-5'; end if;
  if exists (select 1 from public.reviews where order_id = p_order_id) then
    raise exception 'Pesanan sudah diulas';
  end if;

  insert into public.reviews (order_id, user_id, provider_id, rating, comment)
  values (p_order_id, v_user, v_order.provider_id, p_rating, nullif(trim(coalesce(p_comment, '')), ''));
end;
$$;

-- Trigger rating provider ----------------------------------------------------
create or replace function public.refresh_provider_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider uuid := coalesce(new.provider_id, old.provider_id);
begin
  update public.providers p set
    rating_count = (select count(*) from public.reviews where provider_id = v_provider),
    rating_avg = coalesce(
      (select round(avg(rating)::numeric, 1) from public.reviews where provider_id = v_provider), 0)
  where p.id = v_provider;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_provider_rating();

-- Grant execute --------------------------------------------------------------
grant execute on function public.create_order(uuid, jsonb, timestamptz, text, text, double precision, double precision) to authenticated;
grant execute on function public.submit_payment(uuid, text, text) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.submit_review(uuid, int, text) to authenticated;
grant execute on function public.admin_verify_payment(uuid, boolean, text) to authenticated;
grant execute on function public.admin_issue_bill(uuid, jsonb) to authenticated;
grant execute on function public.admin_advance_status(uuid, text, text) to authenticated;
grant execute on function public.is_admin() to authenticated;
