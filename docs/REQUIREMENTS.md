# SiapBantu — Requirement MVP Aplikasi Mobile (Sisi User)

> Dokumen ini adalah spesifikasi untuk dikerjakan oleh Claude Code.
> Simpan di repo sebagai `docs/REQUIREMENTS.md`. Kerjakan **per milestone** (lihat Bagian 11), jangan sekaligus.

---

## 1. Ringkasan Produk

SiapBantu adalah marketplace jasa rumah tangga (laundry, cuci AC, pijat, home cleaning, pekerjaan harian, caregiver). User mencari penyedia jasa, memesan, membayar lewat **transfer bank manual + upload bukti transfer**, lalu memantau status pesanan hingga selesai dan memberi rating.

**Tujuan MVP:** demo end-to-end yang meyakinkan untuk investor, dan bisa dipakai pilot terbatas dengan operasional manual oleh tim SiapBantu.

### 1.1 Dalam cakupan (In Scope)
- Login/daftar dengan nomor WhatsApp + OTP
- Beranda: kategori, pesanan aktif, tagihan, "Sering Kamu Gunakan"
- Daftar penyedia per kategori (rating, jarak, status buka, jenis pembayaran) + pencarian + urutkan
- Detail penyedia & pemilihan jasa
- Ringkasan pesanan (alamat, jadwal, catatan, estimasi biaya)
- Pembayaran deposit / pembayaran penuh via transfer manual + upload bukti
- Pelacakan status pesanan (timeline)
- Tagihan dengan rincian perhitungan, pelunasan
- Rating & ulasan setelah pesanan selesai
- Profil user (ubah nama, alamat, foto rumah, logout)
- Chat diarahkan ke WhatsApp (deep link)
- **Panel Admin minimal** di dalam aplikasi yang sama (role `admin`) untuk: verifikasi pembayaran, konfirmasi pesanan mewakili mitra, input hasil timbang/tagihan, dan memajukan status. Ini dibutuhkan agar alur bisa berjalan saat demo.

### 1.2 Di luar cakupan (Out of Scope)
- Aplikasi khusus penyedia jasa (mitra) — dioperasikan tim lewat Panel Admin/WhatsApp
- Payment gateway otomatis (QRIS/VA/e-wallet) — tahap berikutnya
- Push notification — diganti realtime update di dalam app
- Chat in-app
- Map picker interaktif (cukup "Gunakan lokasi saat ini")
- Promo, voucher, poin, multi-bahasa
- Rilis ke Play Store/App Store (cukup APK / Expo Go untuk demo)

---

## 2. Tech Stack

| Bagian | Pilihan | Alasan |
|---|---|---|
| Mobile | **Expo (React Native) + TypeScript** | Satu kode untuk Android & iOS, demo langsung di HP via Expo Go, build APK via EAS |
| Navigasi | **Expo Router** (file-based) | Struktur layar jelas dan mudah diikuti |
| Backend | **Supabase** | Database Postgres, Auth (OTP telepon), Storage (bukti transfer), Realtime — tanpa perlu menulis server |
| Data fetching | **@tanstack/react-query** + `@supabase/supabase-js` | Cache, loading & error state rapi |
| Form & validasi | **react-hook-form** + **zod** | Validasi input konsisten |
| Styling | `StyleSheet` React Native + file theme token (`src/theme.ts`) | Tanpa konfigurasi tambahan, minim masalah build |
| Lokasi | `expo-location` | Ambil koordinat user untuk hitung jarak |
| Upload gambar | `expo-image-picker` (+ `expo-image-manipulator` untuk kompres) | Bukti transfer & foto rumah |
| Clipboard | `expo-clipboard` | Tombol salin nomor rekening |
| Chat | `Linking.openURL('https://wa.me/...')` | Chat via WhatsApp |

**Aturan untuk Claude Code:**
- Buat project dengan `npx create-expo-app@latest` (SDK stabil terbaru) dan gunakan `npx expo install` untuk dependency Expo agar versinya kompatibel.
- Semua logika bisnis yang menyangkut uang dan status dijalankan di **Postgres function (RPC)**, bukan dihitung di client.
- Semua tabel wajib memakai **Row Level Security (RLS)**.
- Simpan migrasi SQL di `supabase/migrations/` dan seed di `supabase/seed.sql`.
- Kredensial di `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`), jangan di-commit.

### 2.1 OTP WhatsApp
- Gunakan Supabase Phone Auth dengan provider SMS/WhatsApp yang didukung Supabase (misalnya Twilio dengan channel WhatsApp). Cek dokumentasi Supabase terbaru untuk konfigurasinya.
- **Untuk demo:** aktifkan fitur *test phone numbers* di Supabase (nomor + OTP tetap) sehingga demo tidak bergantung pada pengiriman pesan.
- Format nomor disimpan dalam E.164: input `08123...` → `+628123...`.

---

## 3. Struktur Project

```
siapbantu/
├── app/
│   ├── _layout.tsx                 # Provider (QueryClient, Auth), guard auth
│   ├── (auth)/
│   │   ├── login.tsx               # S01
│   │   ├── otp.tsx                 # S02
│   │   └── register.tsx            # S03 (lengkapi profil)
│   ├── (tabs)/
│   │   ├── _layout.tsx             # Bottom tabs: Beranda, Pesanan, Profil
│   │   ├── index.tsx               # S04 Beranda
│   │   ├── orders.tsx              # S11 Daftar Pesanan
│   │   └── profile.tsx             # S15 Profil
│   ├── category/[id].tsx           # S05 Daftar Penyedia
│   ├── provider/[id].tsx           # S06 Detail Penyedia & Pilih Jasa
│   ├── checkout/[providerId].tsx   # S07 Ringkasan Pesanan
│   ├── payment/[orderId].tsx       # S08 Pembayaran (deposit / penuh / pelunasan)
│   ├── payment-submitted/[orderId].tsx  # S09
│   ├── order/[id].tsx              # S10 Detail & Pelacakan Pesanan (+ rincian tagihan)
│   ├── review/[orderId].tsx        # S13 Rating & Ulasan
│   ├── search.tsx                  # S14 Pencarian global
│   └── admin/
│       ├── index.tsx               # A01 Daftar pesanan perlu tindakan
│       └── order/[id].tsx          # A02 Aksi admin per pesanan
├── src/
│   ├── components/                 # Button, Input, Card, StatusBadge, Timeline, RupiahText, dll.
│   ├── lib/supabase.ts
│   ├── lib/format.ts               # formatRupiah, formatPhone, haversine
│   ├── hooks/                      # useAuth, useProviders, useOrders, dll.
│   ├── constants/orderStatus.ts    # label & warna status
│   └── theme.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── docs/REQUIREMENTS.md
```

---

## 4. Model Data (Supabase / Postgres)

Semua uang disimpan sebagai `integer` (rupiah, tanpa desimal). Semua tabel punya `created_at timestamptz default now()`.

### 4.1 `profiles`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | wajib saat registrasi |
| phone | text | E.164, unik |
| address | text | alamat lengkap |
| latitude, longitude | double precision | nullable |
| house_photo_path | text | nullable, path Storage |
| role | text | `user` (default) atau `admin` |

### 4.2 `categories`
| id | uuid PK |
|---|---|
| name | text (Laundry, Elektronik, Wellness, Home Cleaning, Pekerjaan Harian, Caregiver) |
| icon | text (nama ikon) |
| sort_order | int |

### 4.3 `providers`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| category_id | uuid FK | |
| name | text | |
| description | text | |
| logo_url | text | nullable → tampilkan placeholder inisial |
| address | text | |
| latitude, longitude | double precision | |
| whatsapp | text | untuk tombol Chat |
| payment_type | text | `deposit` atau `upfront` |
| deposit_amount | int | wajib jika `deposit` (mis. 20000) |
| open_time, close_time | time | jam operasional (WIB) |
| is_available | boolean | toggle manual oleh admin |
| rating_avg | numeric(2,1) | diperbarui otomatis dari `reviews` |
| rating_count | int | |

**Status tampilan penyedia** (dihitung di client):
- `Tersedia` (hijau): `is_available = true` dan jam sekarang di antara `open_time`–`close_time`
- `Tutup` (abu-abu): `is_available = true` tetapi di luar jam operasional. Tampilkan "Buka pukul 08.00"
- `Tidak Tersedia` (merah): `is_available = false` (mis. sedang penuh/libur)
- Hanya penyedia `Tersedia` yang bisa dipesan.

### 4.4 `services`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| provider_id | uuid FK | |
| name | text | mis. "Cuci Komplit" |
| description | text | mis. "Selesai 2–3 hari" |
| unit | text | `kg`, `pasang`, `unit`, `sesi`, `jam` |
| price | int | harga per unit |
| service_group | text | nullable. Jasa dalam grup yang sama **saling eksklusif** (radio), beda grup boleh dipilih bersamaan (checkbox) |
| is_active | boolean | |

### 4.5 `orders`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| code | text unik | format `SB-YYMMDD-XXXX` |
| user_id | uuid FK profiles | |
| provider_id | uuid FK | |
| payment_type | text | salinan dari provider saat order dibuat |
| status | text | lihat Bagian 5 |
| address | text | salinan alamat saat order |
| latitude, longitude | double precision | |
| scheduled_at | timestamptz | jadwal jemput/datang |
| notes | text | nullable |
| deposit_amount | int | 0 jika upfront |
| estimated_total | int | estimasi dari qty yang diinput user |
| final_total | int | nullable, diisi setelah tagihan terbit |
| amount_due | int | nullable, `final_total - deposit_amount` (deposit) atau total (upfront) |
| cancel_reason | text | nullable |
| updated_at | timestamptz | |

### 4.6 `order_items`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| service_id | uuid FK | |
| service_name | text | snapshot |
| unit | text | snapshot |
| price | int | snapshot harga saat order |
| estimated_qty | numeric(6,2) | input user (estimasi) |
| final_qty | numeric(6,2) | nullable, hasil timbang/aktual oleh admin |
| subtotal | int | `price × (final_qty ?? estimated_qty)`, dibulatkan ke rupiah |

### 4.7 `payments`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| kind | text | `deposit`, `full`, `settlement` (pelunasan) |
| amount | int | |
| proof_path | text | path di bucket `payment-proofs` |
| status | text | `pending`, `approved`, `rejected` |
| reject_reason | text | nullable |
| verified_by | uuid | nullable, admin |
| verified_at | timestamptz | nullable |

### 4.8 `order_status_logs`
`id`, `order_id`, `status`, `note`, `created_by`, `created_at` — sumber data timeline di layar pelacakan.

### 4.9 `reviews`
`id`, `order_id` (unik), `user_id`, `provider_id`, `rating` (int 1–5), `comment` (text, nullable). Trigger memperbarui `providers.rating_avg` dan `rating_count`.

### 4.10 `app_settings`
Key-value: `bank_name` (BCA), `bank_account_number` (1234567), `bank_account_name` (SIAPBANTU), `cs_whatsapp` (nomor CS).

### 4.11 Storage buckets
- `payment-proofs` (private): path `{user_id}/{order_id}/{timestamp}.jpg`. User hanya bisa upload/baca foldernya sendiri; admin bisa baca semua.
- `house-photos` (private): path `{user_id}/house.jpg`.

### 4.12 RLS (ringkas)
- `categories`, `providers`, `services`, `reviews`, `app_settings`: baca publik untuk user login; tulis hanya admin.
- `profiles`: user baca/ubah miliknya; admin baca semua. Kolom `role` tidak boleh diubah user.
- `orders`, `order_items`, `payments`, `order_status_logs`: user hanya baca miliknya; **insert/update hanya lewat RPC** (`security definer`). Admin baca semua.
- Helper: `is_admin()` mengecek `profiles.role = 'admin'`.

---

## 5. Alur Status Pesanan

### 5.1 Daftar status
| Kode | Label untuk user | Pelaku berikutnya |
|---|---|---|
| `awaiting_deposit` | Menunggu Pembayaran Deposit | User |
| `verifying_deposit` | Deposit Sedang Diverifikasi | Admin |
| `awaiting_payment` | Menunggu Pembayaran | User |
| `verifying_payment` | Pembayaran Sedang Diverifikasi | Admin |
| `awaiting_provider` | Menunggu Konfirmasi Penyedia | Admin (mewakili mitra) |
| `on_the_way` | Penyedia Menuju Rumahmu | Admin |
| `in_progress` | Sedang Dikerjakan | Admin |
| `delivering` | Sedang Diantar | Admin |
| `completed` | Selesai | — |
| `cancelled` | Dibatalkan | — |

### 5.2 Alur A — `payment_type = deposit` (mis. laundry kiloan)
```
awaiting_deposit ──upload bukti──▶ verifying_deposit ──admin approve──▶ awaiting_provider
      ▲                                   │
      └────────── admin reject ───────────┘  (alasan ditampilkan ke user, user upload ulang)

awaiting_provider ──admin terima──▶ on_the_way ──admin input hasil timbang──▶ awaiting_payment
awaiting_payment ──upload bukti pelunasan──▶ verifying_payment ──approve──▶ in_progress
                        ▲                          │
                        └──────── reject ──────────┘
in_progress ──▶ delivering ──▶ completed
```
Catatan: jika `amount_due <= 0` (deposit sudah menutupi total), lewati pembayaran dan langsung ke `in_progress`. Kelebihan deposit ditampilkan sebagai "Akan dikembalikan tim SiapBantu" (refund manual).

### 5.3 Alur B — `payment_type = upfront` (harga pasti, mis. cuci AC per unit, pijat per sesi)
```
awaiting_payment ──upload──▶ verifying_payment ──approve──▶ awaiting_provider
awaiting_provider ──▶ on_the_way ──▶ in_progress ──▶ completed
```
(`delivering` hanya dipakai bila jasa butuh antar balik, mis. laundry sepatu. Admin boleh melewatinya.)

### 5.4 Pembatalan
- User boleh membatalkan selama status `awaiting_deposit`, `verifying_deposit`, `awaiting_payment` (hanya Alur B), `verifying_payment` (hanya Alur B), atau `awaiting_provider`.
- Jika sudah ada pembayaran yang disetujui, tampilkan: "Dana akan dikembalikan oleh tim SiapBantu maksimal 1x24 jam hari kerja."
- Admin boleh membatalkan di status apa pun sebelum `completed`, wajib isi alasan.

### 5.5 Setiap perubahan status
- Insert baris ke `order_status_logs`.
- Update `orders.updated_at`.
- Validasi transisi di RPC; transisi yang tidak valid → error.

---

## 6. RPC (Postgres Functions)

| Function | Dipanggil oleh | Tugas |
|---|---|---|
| `create_order(provider_id, items[{service_id, estimated_qty}], scheduled_at, notes)` | User | Validasi penyedia tersedia, validasi aturan `service_group`, snapshot harga, hitung `estimated_total`, set status awal (`awaiting_deposit` / `awaiting_payment`), set `amount_due` untuk upfront, generate `code`. Return `order_id` |
| `submit_payment(order_id, kind, proof_path)` | User | Pastikan status cocok dengan `kind`, buat `payments` pending, pindahkan status ke `verifying_*` |
| `cancel_order(order_id, reason)` | User/Admin | Sesuai aturan 5.4 |
| `admin_verify_payment(payment_id, approve, reject_reason)` | Admin | Approve/reject dan transisi status |
| `admin_issue_bill(order_id, items[{order_item_id, final_qty}])` | Admin | Hitung subtotal, `final_total`, `amount_due`; status → `awaiting_payment` (atau `in_progress` jika `amount_due <= 0`) |
| `admin_advance_status(order_id, next_status, note)` | Admin | Transisi manual yang valid saja |
| `submit_review(order_id, rating, comment)` | User | Hanya jika `completed`, milik user, belum pernah review |

---

## 7. Spesifikasi Layar

Setiap layar wajib punya: **loading state**, **empty state**, **error state dengan tombol "Coba Lagi"**, dan dapat di-scroll di layar kecil (min. lebar 360 dp).

### S01 — Login
- Input nomor WhatsApp (keyboard numeric, prefix +62 tampil tetap). Tombol **MASUK**.
- Link "Belum punya akun? **Daftar**" → mengarah ke alur OTP yang sama (daftar & login sama-sama lewat OTP).
- **Kriteria:** validasi nomor Indonesia (9–13 digit setelah 0/62); tombol disabled saat invalid atau sedang loading; error jelas bila gagal kirim OTP.

### S02 — Verifikasi OTP
- Teks "Kode dikirim ke WhatsApp +62 812-xxxx". Input 6 digit (auto-focus, auto-submit saat lengkap).
- Tombol "Kirim ulang" dengan hitung mundur 60 detik. Link "Ganti nomor".
- **Kriteria:** setelah sukses, jika `profiles.full_name` kosong → S03, jika tidak → S04. OTP salah → pesan "Kode salah, coba lagi".

### S03 — Lengkapi Profil (Daftar)
- Field: **Nama** (wajib), **Alamat Rumah** (wajib, multiline), tombol **"Gunakan lokasi saat ini"** (isi lat/lng, tampilkan "Lokasi tersimpan ✓"), **Upload Foto Rumah (Opsional)** dengan preview & hapus.
- Tombol **REGISTER**.
- **Kriteria:** jika izin lokasi ditolak, tetap bisa lanjut tetapi tampilkan info "Jarak penyedia tidak bisa dihitung"; foto dikompres (maks lebar 1280 px).

### S04 — Beranda (tab)
Urutan konten:
1. Sapaan "**{Nama depan}**, mau pakai jasa apa hari ini?"
2. Search bar → S14.
3. **Tagihan** (hanya jika ada order `awaiting_payment`/`awaiting_deposit`): kartu dengan nama penyedia, nominal, tombol **Bayar** → S08. Ditaruh paling atas karena perlu tindakan.
4. **Pesanan Aktif** (maks 3): nama penyedia, badge status, tombol **Lihat Detail** → S10.
5. **Kategori**: grid 3 kolom (6 kategori) → S05.
6. **Sering Kamu Gunakan**: penyedia dari pesanan `completed` user, urut frekuensi, maks 3, tombol **Pilih** → S06. Sembunyikan jika kosong.
7. Tombol chat melayang (kanan bawah) → WhatsApp CS SiapBantu.
- **Kriteria:** pull-to-refresh; status pesanan terupdate realtime.

### S05 — Daftar Penyedia per Kategori
- Judul "Kategori: {nama}". Search bar (filter nama penyedia di kategori ini).
- Chip urutkan: **Terdekat** (default jika lokasi ada), **Rating Tertinggi**.
- Kartu penyedia (menggabungkan dua desain lama): logo, nama, rating ★ + (jumlah) atau "Belum ada rating", **jarak** (haversine, format "4,3 km"), badge status (Tersedia/Tutup/Tidak Tersedia), **jenis pembayaran** ("Deposit Rp20.000, sisanya setelah ditimbang" atau "Bayar di depan").
- Penyedia Tersedia ditampilkan lebih dulu; kartu Tutup/Tidak Tersedia tampil redup tetapi tetap bisa dibuka detailnya.
- **Kriteria:** empty state "Belum ada penyedia di kategori ini".

### S06 — Detail Penyedia & Pilih Jasa
- Header: logo, nama, rating, jarak, jam buka, status, jenis pembayaran, deskripsi singkat.
- Daftar jasa: nama, deskripsi, harga "Rp10.000 / kg". Jasa satu `service_group` → radio (bisa di-unselect); lainnya → checkbox.
- Untuk jasa terpilih tampil stepper **estimasi jumlah** (kg: kelipatan 0,5, default 1; unit lain: bilangan bulat, default 1).
- Footer sticky: "Estimasi Rp{total}" + tombol **Lanjut** (Primary) dan tombol **Chat Penjual** (Secondary → WhatsApp penyedia dengan teks otomatis "Halo {penyedia}, saya dari SiapBantu ingin bertanya...").
- **Kriteria:** LANJUT disabled jika tidak ada jasa dipilih atau penyedia tidak Tersedia (tampilkan alasan). Untuk satuan kg tampilkan catatan: "Harga akhir mengikuti hasil timbang."

### S07 — Ringkasan Pesanan (Checkout)
- Alamat (default dari profil, bisa diubah untuk pesanan ini), jadwal (pilih tanggal: hari ini/besok/lusa + slot jam dalam jam operasional), catatan opsional.
- Rincian jasa & estimasi subtotal, **estimasi total**.
- Info pembayaran:
  - deposit: "Bayar deposit **Rp20.000** sekarang. Sisa tagihan dibayar setelah ditimbang. Deposit akan dipotong dari total tagihan."
  - upfront: "Bayar **Rp{total}** sekarang."
- Tombol **BUAT PESANAN** → dialog konfirmasi standar (bukan balon chat): judul "Konfirmasi Pesanan", teks sesuai tipe pembayaran, tombol **Batal** & **Ya, Buat Pesanan** → panggil `create_order` → S08.

### S08 — Pembayaran (dipakai untuk deposit, pembayaran penuh, dan pelunasan)
- Judul dinamis: "Transfer Deposit" / "Bayar Pesanan" / "Bayar Tagihan".
- Kode pesanan, **nominal** besar dan jelas.
- Untuk pelunasan: tampilkan rincian ringkas (total − deposit = sisa) + link "Lihat rincian" → S10.
- Tujuan transfer dari `app_settings`: "BCA 1234567 a.n. SIAPBANTU" + tombol salin (toast "Nomor rekening disalin").
- Area **Upload Bukti Transfer** (kamera/galeri, preview, ganti).
- Jika pembayaran sebelumnya ditolak: banner merah dengan alasan.
- Tombol **KIRIM BUKTI PEMBAYARAN** (disabled sampai ada foto) → upload ke Storage → `submit_payment` → S09.

### S09 — Bukti Pembayaran Terkirim
- Ikon jam/hourglass, judul "**Pembayaran Sedang Diverifikasi**".
- Teks: "Terima kasih! Tim kami akan memverifikasi pembayaranmu maksimal 30 menit pada jam operasional. Kamu bisa memantau statusnya di halaman pesanan."
- Tombol **Lihat Pesanan** → S10, **Kembali ke Beranda**.
- (Kalimat "Penyedia jasa segera menuju rumahmu" hanya muncul di timeline saat status `on_the_way`.)

### S10 — Detail & Pelacakan Pesanan
- Header: kode pesanan, nama penyedia, badge status, tanggal & jadwal.
- **Timeline vertikal** sesuai alur (5.2/5.3): langkah selesai (centang + waktu dari `order_status_logs`), langkah aktif (disorot), langkah berikutnya (abu-abu).
- **Kartu tindakan** sesuai status: "Bayar Deposit"/"Bayar Tagihan" → S08; "Beri Rating" → S13 (saat `completed` & belum review).
- **Rincian Tagihan** (setelah tagihan terbit):
  ```
  Cuci Kilat 24 Jam   5 kg × Rp20.000   Rp100.000
  Setrika Saja        2 kg × Rp5.000     Rp10.000
  ─────────────────────────────────────────────
  Total                                  Rp110.000
  Deposit dibayar                       −Rp20.000
  Sisa Tagihan                           Rp90.000
  ```
  Sebelum tagihan terbit tampilkan versi **estimasi** berlabel "Estimasi".
- Riwayat pembayaran (jenis, nominal, status: Diverifikasi/Menunggu/Ditolak + alasan).
- Info alamat, catatan. Tombol **Chat Penyedia** (WhatsApp) dan **Batalkan Pesanan** (hanya sesuai aturan 5.4, dengan dialog konfirmasi + alasan).
- **Kriteria:** status berubah realtime (Supabase Realtime) tanpa refresh manual.

### S11 — Daftar Pesanan (tab)
- Segmented control: **Aktif** / **Riwayat** (completed & cancelled).
- Item: nama penyedia, kategori, tanggal, badge status, total/estimasi, "Lihat Detail" → S10.

### S13 — Rating & Ulasan
- 5 bintang (wajib), komentar opsional (maks 500 karakter), tombol **Kirim**.
- Setelah sukses: toast "Terima kasih atas ulasanmu" dan kembali ke S10 (tombol rating hilang).

### S14 — Pencarian Global
- Input dengan debounce 300 ms, cari nama penyedia, nama jasa, dan kategori. Hasil memakai kartu seperti S05.
- Empty state: "Tidak ditemukan. Coba kata kunci lain."

### S15 — Profil (tab)
- Nama, nomor WhatsApp (read-only), alamat, foto rumah — bisa diedit (form sama dengan S03).
- Menu: **Hubungi CS** (WhatsApp), **Panel Admin** (hanya jika `role = admin`), **Keluar** (dialog konfirmasi).
- Versi aplikasi di bagian bawah.

### A01 — Panel Admin: Daftar Pesanan
- Tab: **Perlu Verifikasi** (`verifying_*`), **Perlu Konfirmasi** (`awaiting_provider`), **Berjalan** (`on_the_way`, `in_progress`, `delivering`), **Semua**.
- Item: kode, nama user, penyedia, status, waktu update. Realtime.

### A02 — Panel Admin: Detail Pesanan
- Semua info S10 + nomor WhatsApp user (tombol chat).
- Aksi sesuai status:
  - `verifying_*`: tampilkan foto bukti (signed URL, bisa zoom), tombol **Setujui** / **Tolak** (wajib alasan).
  - `awaiting_provider`: **Terima (Penyedia berangkat)** → `on_the_way`.
  - `on_the_way` & tipe deposit: form **Input Hasil Timbang/Jumlah Aktual** per item → preview total & sisa → **Terbitkan Tagihan**.
  - `on_the_way` & upfront: **Mulai Dikerjakan**.
  - `in_progress`: **Antar** / **Selesai**. `delivering`: **Selesai**.
  - Selalu: **Batalkan** (wajib alasan).
- Semua aksi melalui RPC admin, dengan dialog konfirmasi.

---

## 8. Aturan Bisnis & Format

- Format rupiah: `Rp10.000` (titik pemisah ribuan, tanpa spasi, tanpa desimal). Satu helper `formatRupiah` untuk seluruh app.
- Jarak: 1 desimal dengan koma, mis. `4,3 km`; di bawah 1 km tampil dalam meter, mis. `850 m`.
- Waktu: zona **Asia/Jakarta**, format `Sel, 15 Sep 2026 • 09.00`.
- Subtotal per item dibulatkan ke rupiah terdekat.
- Deposit tidak bisa melebihi estimasi total; jika estimasi < deposit tetap tagih deposit (kelebihan direfund manual setelah tagihan final).
- Satu user boleh punya beberapa pesanan aktif sekaligus.
- Nomor rekening & CS diambil dari `app_settings`, bukan hardcode.

---

## 9. Panduan Desain

Palet final untuk MVP. Arah visualnya **biru yang terpercaya dan bersih**, turunan dari warna logo SiapBantu. Prinsip utamanya:
- **Satu warna aksi utama (biru).** Semua tombol utama (MASUK, LANJUT, BUAT PESANAN, KIRIM BUKTI) memakai `primary`. Warna hijau tidak dipakai untuk tombol supaya user tidak bingung mana aksi utama.
- **Warna status hanya untuk informasi** (badge, banner, timeline), selalu dalam pasangan teks gelap di atas latar muda agar mudah dibaca.
- Kontras teks memenuhi WCAG AA (min. 4.5:1 untuk teks normal).
- **Light mode saja** untuk MVP (paksa `userInterfaceStyle: "light"` di `app.json`).

### 9.1 Token warna (`src/theme.ts`)

```ts
export const colors = {
  // Brand
  primary:        '#1D6FE0', // tombol utama, link, tab aktif, ikon kategori
  primaryPressed: '#1558B8', // state ditekan
  primarySoft:    '#E8F1FD', // latar ikon kategori, kartu terpilih, chip aktif
  navy:           '#0F2E6B', // tombol chat melayang, header gelombang, judul brand

  // Netral
  background:     '#F7F9FC', // latar layar
  surface:        '#FFFFFF', // kartu, bottom sheet, input
  border:         '#E2E8F0', // garis kartu & input
  borderStrong:   '#CBD5E1', // input fokus-nonaktif, divider tebal
  text:           '#0F172A', // teks utama
  textSecondary:  '#475569', // teks pendukung (deskripsi, tanggal)
  textMuted:      '#94A3B8', // placeholder & elemen disabled saja
  disabledBg:     '#E2E8F0',

  // Status (teks + latar)
  success:        '#15803D', successSoft: '#DCFCE7',
  warning:        '#B45309', warningSoft: '#FEF3C7',
  danger:         '#DC2626', dangerSoft:  '#FEE2E2',
  info:           '#1D4ED8', infoSoft:    '#DBEAFE',
  neutral:        '#475569', neutralSoft: '#F1F5F9',

  // Khusus
  star:           '#F59E0B', // bintang rating
  whatsapp:       '#25D366', // hanya untuk ikon WhatsApp
  overlay:        'rgba(15, 23, 42, 0.5)', // latar belakang dialog
};
```

### 9.2 Pemakaian warna status

| Konteks | Nilai | Warna |
|---|---|---|
| Penyedia | Tersedia | `success` / `successSoft` |
| Penyedia | Tutup | `neutral` / `neutralSoft` |
| Penyedia | Tidak Tersedia | `danger` / `dangerSoft` |
| Pesanan — **perlu tindakanmu** | `awaiting_deposit`, `awaiting_payment` | `warning` / `warningSoft` |
| Pesanan — **menunggu pihak lain** | `verifying_deposit`, `verifying_payment`, `awaiting_provider` | `neutral` / `neutralSoft` |
| Pesanan — **sedang berjalan** | `on_the_way`, `in_progress`, `delivering` | `info` / `infoSoft` |
| Pesanan | `completed` | `success` / `successSoft` |
| Pesanan | `cancelled` | `danger` / `dangerSoft` |
| Banner pembayaran ditolak | — | teks `danger` di latar `dangerSoft` + ikon peringatan |
| Kartu Tagihan di Beranda | — | garis kiri 4 dp `warning`, latar `surface` |
| Timeline | selesai / aktif / berikutnya | `success` / `primary` / `borderStrong` |

Warna tidak boleh menjadi satu-satunya penanda. Badge selalu berisi teks label, dan timeline selalu memakai ikon (centang, titik, lingkaran kosong).

### 9.3 Tombol

| Varian | Latar | Teks | Border | Pemakaian |
|---|---|---|---|---|
| Primary | `primary` (ditekan: `primaryPressed`) | `#FFFFFF` | — | Aksi utama, maks. 1 per layar |
| Secondary | `surface` | `primary` | 1.5 dp `primary` | Chat Penjual, Lihat Pesanan |
| Ghost | transparan | `primary` | — | Kirim ulang OTP, Ganti nomor |
| Danger | `surface` | `danger` | 1.5 dp `danger` | Batalkan Pesanan, Tolak (admin) |
| Disabled | `disabledBg` | `textMuted` | — | Semua varian saat nonaktif |

Tinggi 52 dp, radius 12, teks 16 semibold, **tidak huruf kapital semua** ("Buat Pesanan", bukan "BUAT PESANAN") agar lebih ramah dan modern. Tombol Setujui di admin memakai varian Primary.

### 9.4 Tipografi
Font **Plus Jakarta Sans** (`@expo-google-fonts/plus-jakarta-sans`), dibuat oleh desainer Indonesia dan cocok dengan karakter lokal.

| Gaya | Ukuran / tinggi baris | Bobot | Pemakaian |
|---|---|---|---|
| `display` | 28 / 36 | 700 | Nominal pembayaran di S08 |
| `h1` | 24 / 32 | 700 | Judul layar |
| `h2` | 18 / 26 | 700 | Judul section (Kategori, Tagihan) |
| `body` | 15 / 22 | 500 | Teks umum, nama penyedia |
| `bodySmall` | 13 / 18 | 500 | Deskripsi, tanggal, jarak |
| `label` | 12 / 16 | 600 | Badge status, label input |

### 9.5 Bentuk, jarak, dan elemen lain
- Skala spasi: 4, 8, 12, 16, 20, 24, 32. Padding layar horizontal 20.
- Radius: kartu & input 12, badge 999 (pill), dialog 16, ikon kategori 16.
- Kartu: latar `surface`, border 1 dp `border`, tanpa shadow tebal (maks. elevation 1).
- Input: tinggi 52, border `border`; saat fokus border 1.5 dp `primary`; saat error border `danger` + teks error di bawah.
- Ikon kategori: kotak 64×64 latar `primarySoft`, ikon 32 dp warna `primary` (lebih ringan daripada kotak biru penuh di desain lama).
- Ornamen gelombang: hanya di bagian atas Login/OTP/Daftar, gradasi `navy` → `primary` dengan lapisan transparan `#FFFFFF` 20%. Beranda cukup header polos `background`. Tidak ada ornamen di bagian bawah layar agar tidak bertabrakan dengan tombol dan tab bar.
- Tombol chat melayang: lingkaran 56 dp `navy`, ikon putih, 16 dp dari kanan dan di atas tab bar.
- Bottom tab: latar `surface`, ikon aktif `primary`, nonaktif `textMuted`.
- Logo penyedia kosong: rounded square latar `primarySoft` berisi inisial warna `primary`.
- Ikon dari `@expo/vector-icons` (set Ionicons).
- Splash screen: latar `primary`, logo putih. App icon: logo SiapBantu di latar putih.
- Status bar: teks gelap di layar biasa, teks terang di layar dengan gradasi.

---

## 10. Seed Data (satu cerita demo yang konsisten)

**app_settings:** BCA / 1234567 / SIAPBANTU / CS `+6281200000000` (placeholder).

**Kategori:** Laundry, Elektronik, Wellness, Home Cleaning, Pekerjaan Harian, Caregiver.

**Penyedia (koordinat sekitar Jakarta Barat, variasikan jaraknya):**

| Penyedia | Kategori | Pembayaran | Status | Rating |
|---|---|---|---|---|
| Laundry Semalam Suntuk | Laundry | deposit Rp20.000 | Tersedia (06.00–22.00) | belum ada |
| Laundry Grib Jaya | Laundry | deposit Rp20.000 | Tutup (jam buka 08.00–12.00) | 4,5 (300) |
| Laundry Sepatu Roda 3 | Laundry | upfront | Tidak Tersedia | 4,5 (2) |
| Laundry Maju Jaya | Laundry | deposit Rp20.000 | Tersedia | 4,7 (120) |
| Cuci AC Tomang Elok | Elektronik | upfront | Tersedia | 4,8 (85) |
| Pijat Refleksi Sehat Bugar | Wellness | upfront | Tersedia | 4,6 (40) |
| Bersih Kinclong | Home Cleaning | upfront | Tersedia | 4,4 (60) |

**Jasa Laundry Semalam Suntuk:**
- Cuci Komplit — Rp10.000/kg — "Selesai 2–3 hari" — group `cuci`
- Cuci Kilat 24 Jam — Rp20.000/kg — "Selesai dalam 24 jam" — group `cuci`
- Setrika Saja — Rp5.000/kg — tanpa group

**Jasa lain (contoh):** Cuci AC Split Rp75.000/unit; Pijat Refleksi 60 menit Rp120.000/sesi; Bersih Rumah Standar Rp150.000/sesi; Cuci Sepatu Rp35.000/pasang; Laundry Maju Jaya: Cuci Kering Rp8.000/kg (group `cuci`), Cuci 24 Jam Rp18.000/kg (group `cuci`).

**Akun demo:**
- User: "Karya", nomor tes Supabase, alamat di Jakarta Barat, punya 2 pesanan `completed` (Laundry Maju Jaya & Cuci AC Tomang Elok) supaya "Sering Kamu Gunakan" terisi.
- Admin: nomor tes kedua, `role = admin`.

Seed dibuat idempoten (aman dijalankan ulang).

---

## 11. Milestone untuk Claude Code

Kerjakan berurutan. Di akhir tiap milestone: pastikan `npx tsc --noEmit` lolos, app berjalan di Expo Go, dan beri ringkasan apa yang selesai.

| # | Milestone | Isi |
|---|---|---|
| M0 | Setup | Init Expo + TS + Expo Router, theme, komponen dasar (Button, Input, Card, StatusBadge, Dialog, Toast, EmptyState, ErrorState), klien Supabase, react-query |
| M1 | Database | Migrasi semua tabel, RLS, storage bucket & policy, RPC, trigger rating, seed data |
| M2 | Auth | S01, S02, S03, guard navigasi, sesi tersimpan, logout |
| M3 | Katalog | S04 (kategori & chat CS), S05, S06, S14, helper jarak & status penyedia |
| M4 | Pemesanan | S07, S08, S09, upload bukti, `create_order`, `submit_payment` |
| M5 | Pelacakan | S10, S11, rincian tagihan, realtime, pembatalan, bagian Tagihan & Pesanan Aktif di S04 |
| M6 | Admin | A01, A02, semua RPC admin, akses berdasarkan role |
| M7 | Rating & Profil | S13, S15, "Sering Kamu Gunakan" |
| M8 | Polish & Build | Cek semua loading/empty/error state, uji alur demo Bagian 12, app icon & splash SiapBantu, konfigurasi EAS build APK (profile `preview`) |

---

## 12. Skenario Demo (Acceptance Test End-to-End)

Dijalankan dengan **dua HP**: HP-1 akun user Karya, HP-2 akun admin.

1. HP-1 login dengan nomor tes → OTP → masuk Beranda, sapaan "Karya".
2. Buka kategori **Laundry** → urut Terdekat → terlihat 4 penyedia dengan status berbeda (Tersedia, Tutup, Tidak Tersedia).
3. Buka **Laundry Semalam Suntuk** → pilih **Cuci Kilat 24 Jam** (Cuci Komplit otomatis tidak terpilih) + **Setrika Saja**, estimasi 5 kg & 2 kg → estimasi Rp110.000.
4. Checkout → jadwal besok 09.00 → Buat Pesanan → dialog deposit Rp20.000 → Ya.
5. Salin rekening, upload bukti → layar "Pembayaran Sedang Diverifikasi".
6. HP-2 (admin) melihat pesanan di "Perlu Verifikasi" → buka bukti → **Setujui**. HP-1 langsung berubah ke "Menunggu Konfirmasi Penyedia" tanpa refresh.
7. Admin **Terima** → HP-1: "Penyedia Menuju Rumahmu".
8. Admin input hasil timbang 5 kg & 2 kg → **Terbitkan Tagihan**. HP-1: tagihan muncul di Beranda, rincian Rp110.000 − Rp20.000 = **Rp90.000**.
9. HP-1 bayar tagihan & upload bukti → admin coba **Tolak** dengan alasan "Nominal tidak sesuai" → HP-1 melihat banner alasan → upload ulang → admin **Setujui**.
10. Admin: Sedang Dikerjakan → Diantar → Selesai.
11. HP-1 memberi rating 5★ + ulasan → di daftar penyedia, Laundry Semalam Suntuk kini menampilkan rating 5,0 (1).
12. Tab Pesanan → Riwayat berisi pesanan tersebut.

**Definition of Done MVP:** seluruh langkah 1–12 berjalan tanpa error dan tanpa perlu membuka dashboard Supabase.

---

## 13. Pengembangan Setelah MVP (untuk slide roadmap)
Payment gateway (QRIS/VA/e-wallet) dengan verifikasi otomatis, aplikasi mitra, push notification, chat in-app, map picker, promo & voucher, multi-kota, dashboard admin berbasis web.
