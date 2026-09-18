-- SiapBantu — Storage buckets & policy (REQUIREMENTS 4.11).
-- payment-proofs: {user_id}/{order_id}/{timestamp}.jpg
-- house-photos:   {user_id}/house.jpg
-- User hanya folder sendiri; admin bisa baca semua.

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('house-photos', 'house-photos', false)
on conflict (id) do nothing;

-- payment-proofs -------------------------------------------------------------
drop policy if exists pp_select on storage.objects;
create policy pp_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

drop policy if exists pp_insert on storage.objects;
create policy pp_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists pp_update on storage.objects;
create policy pp_update on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

-- house-photos ---------------------------------------------------------------
drop policy if exists hp_select on storage.objects;
create policy hp_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'house-photos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

drop policy if exists hp_insert on storage.objects;
create policy hp_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'house-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists hp_update on storage.objects;
create policy hp_update on storage.objects
  for update to authenticated
  using (bucket_id = 'house-photos' and auth.uid()::text = (storage.foldername(name))[1]);
