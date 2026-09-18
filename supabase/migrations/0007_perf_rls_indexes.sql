-- SiapBantu — Optimasi performa dari Supabase advisor:
-- (1) bungkus auth.uid()/is_admin() dengan (select ...) agar hanya dievaluasi sekali,
-- (2) pisahkan policy admin katalog (FOR ALL → insert/update/delete) agar tak menggandakan SELECT,
-- (3) index untuk foreign key.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'user');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

drop policy if exists order_status_logs_select on public.order_status_logs;
create policy order_status_logs_select on public.order_status_logs for select to authenticated
  using (exists (select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

do $$
declare t text;
begin
  foreach t in array array['categories', 'providers', 'services', 'app_settings'] loop
    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format('create policy %I_admin_insert on public.%I for insert to authenticated with check ((select public.is_admin()))', t, t);
    execute format('create policy %I_admin_update on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
    execute format('create policy %I_admin_delete on public.%I for delete to authenticated using ((select public.is_admin()))', t, t);
  end loop;
end $$;

create index if not exists order_items_service_idx on public.order_items (service_id);
create index if not exists order_status_logs_created_by_idx on public.order_status_logs (created_by);
create index if not exists orders_provider_idx on public.orders (provider_id);
create index if not exists payments_verified_by_idx on public.payments (verified_by);
create index if not exists reviews_user_idx on public.reviews (user_id);
