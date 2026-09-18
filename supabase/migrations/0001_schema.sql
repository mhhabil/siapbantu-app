-- SiapBantu — Skema inti (REQUIREMENTS Bagian 4).
-- Semua uang: integer rupiah. Semua tabel: created_at timestamptz default now().

create extension if not exists "pgcrypto";

-- 4.1 profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique,
  address text,
  latitude double precision,
  longitude double precision,
  house_photo_path text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 4.2 categories -------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 4.3 providers --------------------------------------------------------------
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  description text,
  logo_url text,
  address text,
  latitude double precision,
  longitude double precision,
  whatsapp text,
  payment_type text not null check (payment_type in ('deposit', 'upfront')),
  deposit_amount int not null default 0,
  open_time time,
  close_time time,
  is_available boolean not null default true,
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint deposit_requires_amount
    check (payment_type <> 'deposit' or deposit_amount > 0)
);
create index if not exists providers_category_idx on public.providers (category_id);

-- 4.4 services ---------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  name text not null,
  description text,
  unit text not null check (unit in ('kg', 'pasang', 'unit', 'sesi', 'jam')),
  price int not null check (price >= 0),
  service_group text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists services_provider_idx on public.services (provider_id);

-- 4.5 orders -----------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.providers (id),
  payment_type text not null check (payment_type in ('deposit', 'upfront')),
  status text not null check (status in (
    'awaiting_deposit', 'verifying_deposit', 'awaiting_payment', 'verifying_payment',
    'awaiting_provider', 'on_the_way', 'in_progress', 'delivering', 'completed', 'cancelled'
  )),
  address text not null,
  latitude double precision,
  longitude double precision,
  scheduled_at timestamptz not null,
  notes text,
  deposit_amount int not null default 0,
  estimated_total int not null default 0,
  final_total int,
  amount_due int,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

-- 4.6 order_items ------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  service_id uuid not null references public.services (id),
  service_name text not null,
  unit text not null,
  price int not null,
  estimated_qty numeric(6, 2) not null,
  final_qty numeric(6, 2),
  subtotal int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- 4.7 payments ---------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'full', 'settlement')),
  amount int not null,
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);

-- 4.8 order_status_logs ------------------------------------------------------
create table if not exists public.order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists order_status_logs_order_idx on public.order_status_logs (order_id);

-- 4.9 reviews ----------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_provider_idx on public.reviews (provider_id);

-- 4.10 app_settings ----------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
