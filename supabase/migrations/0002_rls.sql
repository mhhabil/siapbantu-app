-- SiapBantu — Row Level Security (REQUIREMENTS 4.12).
-- Prinsip: katalog dibaca publik (user login), tulis hanya admin.
-- orders/items/payments/logs: user hanya baca miliknya; insert/update via RPC (security definer).

-- Helper: cek admin. security definer agar tidak rekursif dengan policy profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Cegah user mengubah kolom role sendiri.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Tidak boleh mengubah role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- Aktifkan RLS di semua tabel.
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.providers         enable row level security;
alter table public.services          enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.order_status_logs enable row level security;
alter table public.reviews           enable row level security;
alter table public.app_settings      enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Katalog: SELECT untuk semua user login; tulis hanya admin --------------------
do $$
declare t text;
begin
  foreach t in array array['categories', 'providers', 'services', 'app_settings'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format(
      'create policy %I_admin_write on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t);
  end loop;
end $$;

-- reviews: baca publik (user login); tulis lewat RPC (tidak ada policy write) --
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to authenticated using (true);

-- orders: user baca miliknya, admin baca semua. Insert/update via RPC ---------
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists order_status_logs_select on public.order_status_logs;
create policy order_status_logs_select on public.order_status_logs
  for select to authenticated
  using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
