-- SiapBantu — Seed demo (REQUIREMENTS Bagian 10). Idempoten (aman diulang).
-- UUID statis agar relasi stabil & upsert bisa ON CONFLICT.

-- app_settings ---------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('bank_name', 'BCA'),
  ('bank_account_number', '1234567'),
  ('bank_account_name', 'SIAPBANTU'),
  ('cs_whatsapp', '+6281200000000')
on conflict (key) do update set value = excluded.value;

-- categories -----------------------------------------------------------------
insert into public.categories (id, name, icon, sort_order) values
  ('00000000-0000-0000-0000-0000000000c1', 'Laundry', 'shirt', 1),
  ('00000000-0000-0000-0000-0000000000c2', 'Elektronik', 'snow', 2),
  ('00000000-0000-0000-0000-0000000000c3', 'Wellness', 'body', 3),
  ('00000000-0000-0000-0000-0000000000c4', 'Home Cleaning', 'sparkles', 4),
  ('00000000-0000-0000-0000-0000000000c5', 'Pekerjaan Harian', 'construct', 5),
  ('00000000-0000-0000-0000-0000000000c6', 'Caregiver', 'heart', 6)
on conflict (id) do update
  set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

-- providers ------------------------------------------------------------------
-- Lokasi sekitar Jakarta Barat; jarak divariasikan dari titik user (-6.1701, 106.7890).
insert into public.providers (
  id, category_id, name, description, address, latitude, longitude, whatsapp,
  payment_type, deposit_amount, open_time, close_time, is_available, rating_avg, rating_count
) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1',
   'Laundry Semalam Suntuk', 'Laundry kiloan cepat, cuci & setrika rapi.',
   'Jl. Kebon Jeruk Raya No.1, Jakarta Barat', -6.1725, 106.7905, '+6281200001001',
   'deposit', 20000, '06:00', '22:00', true, 0, 0),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1',
   'Laundry Grib Jaya', 'Laundry harian terpercaya.',
   'Jl. Panjang No.10, Jakarta Barat', -6.1810, 106.7830, '+6281200001002',
   'deposit', 20000, '08:00', '12:00', true, 4.5, 300),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1',
   'Laundry Sepatu Roda 3', 'Spesialis cuci sepatu & tas.',
   'Jl. Meruya Ilir No.5, Jakarta Barat', -6.2010, 106.7400, '+6281200001003',
   'upfront', 0, '09:00', '18:00', false, 4.5, 2),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c1',
   'Laundry Maju Jaya', 'Laundry kiloan langganan warga.',
   'Jl. Kelapa Dua No.8, Jakarta Barat', -6.1980, 106.7850, '+6281200001004',
   'deposit', 20000, '00:00', '23:59', true, 4.7, 120),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c2',
   'Cuci AC Tomang Elok', 'Servis & cuci AC berpengalaman.',
   'Jl. Tomang Raya No.20, Jakarta Barat', -6.1660, 106.7950, '+6281200001005',
   'upfront', 0, '08:00', '20:00', true, 4.8, 85),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c3',
   'Pijat Refleksi Sehat Bugar', 'Terapis profesional datang ke rumah.',
   'Jl. Rawa Belong No.3, Jakarta Barat', -6.1900, 106.7880, '+6281200001006',
   'upfront', 0, '09:00', '21:00', true, 4.6, 40),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c4',
   'Bersih Kinclong', 'Jasa bersih rumah menyeluruh.',
   'Jl. Kembangan No.7, Jakarta Barat', -6.1850, 106.7500, '+6281200001007',
   'upfront', 0, '07:00', '19:00', true, 4.4, 60)
on conflict (id) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude,
  whatsapp = excluded.whatsapp, payment_type = excluded.payment_type,
  deposit_amount = excluded.deposit_amount, open_time = excluded.open_time,
  close_time = excluded.close_time, is_available = excluded.is_available,
  rating_avg = excluded.rating_avg, rating_count = excluded.rating_count;

-- services -------------------------------------------------------------------
insert into public.services (id, provider_id, name, description, unit, price, service_group, is_active) values
  -- Laundry Semalam Suntuk
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
   'Cuci Komplit', 'Selesai 2–3 hari', 'kg', 10000, 'cuci', true),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
   'Cuci Kilat 24 Jam', 'Selesai dalam 24 jam', 'kg', 20000, 'cuci', true),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1',
   'Setrika Saja', 'Rapi & wangi', 'kg', 5000, null, true),
  -- Laundry Grib Jaya
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a2',
   'Cuci Reguler', 'Selesai 2 hari', 'kg', 7000, 'cuci', true),
  -- Laundry Sepatu Roda 3
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a3',
   'Cuci Sepatu', 'Deep clean sepatu', 'pasang', 35000, null, true),
  -- Laundry Maju Jaya
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000a4',
   'Cuci Kering', 'Selesai 2 hari', 'kg', 8000, 'cuci', true),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000000a4',
   'Cuci 24 Jam', 'Selesai dalam 24 jam', 'kg', 18000, 'cuci', true),
  -- Cuci AC Tomang Elok
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000a5',
   'Cuci AC Split', 'Per unit, termasuk pembersihan', 'unit', 75000, null, true),
  -- Pijat Refleksi
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000a6',
   'Pijat Refleksi 60 menit', 'Sesi 60 menit', 'sesi', 120000, null, true),
  -- Bersih Kinclong
  ('00000000-0000-0000-0000-000000000b10', '00000000-0000-0000-0000-0000000000a7',
   'Bersih Rumah Standar', 'Sesi menyeluruh', 'sesi', 150000, null, true)
on conflict (id) do update set
  provider_id = excluded.provider_id, name = excluded.name, description = excluded.description,
  unit = excluded.unit, price = excluded.price, service_group = excluded.service_group,
  is_active = excluded.is_active;

-- Data demo user Karya + admin ----------------------------------------------
-- Hanya berjalan bila akun auth dengan nomor tes sudah pernah login.
-- Ganti nomor sesuai "test phone numbers" di Supabase bila berbeda.
-- Trigger proteksi role dimatikan sesaat karena seed dijalankan tanpa konteks auth.uid().
alter table public.profiles disable trigger profiles_prevent_role_change;

do $$
declare
  v_karya uuid;
  v_admin uuid;
begin
  select id into v_karya from auth.users
    where phone in ('6281200000001', '+6281200000001') limit 1;
  select id into v_admin from auth.users
    where phone in ('6281200000002', '+6281200000002') limit 1;

  if v_karya is not null then
    insert into public.profiles (id, full_name, phone, address, latitude, longitude, role)
    values (v_karya, 'Karya', '+6281200000001',
            'Jl. Kebon Jeruk Raya No.99, Jakarta Barat', -6.1701, 106.7890, 'user')
    on conflict (id) do update set
      full_name = excluded.full_name, address = excluded.address,
      latitude = excluded.latitude, longitude = excluded.longitude, role = 'user';

    -- Dua pesanan completed untuk "Sering Kamu Gunakan".
    insert into public.orders (
      id, code, user_id, provider_id, payment_type, status, address, latitude, longitude,
      scheduled_at, deposit_amount, estimated_total, final_total, amount_due, created_at
    ) values
      ('00000000-0000-0000-0000-0000000000d1', 'SB-260101-D001', v_karya,
       '00000000-0000-0000-0000-0000000000a4', 'deposit', 'completed',
       'Jl. Kebon Jeruk Raya No.99, Jakarta Barat', -6.1701, 106.7890,
       now() - interval '10 days', 20000, 40000, 40000, 20000, now() - interval '10 days'),
      ('00000000-0000-0000-0000-0000000000d2', 'SB-260102-D002', v_karya,
       '00000000-0000-0000-0000-0000000000a5', 'upfront', 'completed',
       'Jl. Kebon Jeruk Raya No.99, Jakarta Barat', -6.1701, 106.7890,
       now() - interval '5 days', 0, 75000, 75000, 75000, now() - interval '5 days')
    on conflict (id) do nothing;

    insert into public.order_items (
      id, order_id, service_id, service_name, unit, price, estimated_qty, final_qty, subtotal
    ) values
      ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1',
       '00000000-0000-0000-0000-0000000000b6', 'Cuci Kering', 'kg', 8000, 5, 5, 40000),
      ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d2',
       '00000000-0000-0000-0000-0000000000b8', 'Cuci AC Split', 'unit', 75000, 1, 1, 75000)
    on conflict (id) do nothing;

    insert into public.order_status_logs (order_id, status, note, created_by) values
      ('00000000-0000-0000-0000-0000000000d1', 'completed', 'Pesanan selesai', v_karya),
      ('00000000-0000-0000-0000-0000000000d2', 'completed', 'Pesanan selesai', v_karya)
    on conflict do nothing;
  end if;

  if v_admin is not null then
    insert into public.profiles (id, full_name, phone, address, role)
    values (v_admin, 'Admin SiapBantu', '+6281200000002', 'Kantor SiapBantu', 'admin')
    on conflict (id) do update set role = 'admin', full_name = excluded.full_name;
  end if;
end $$;

alter table public.profiles enable trigger profiles_prevent_role_change;
