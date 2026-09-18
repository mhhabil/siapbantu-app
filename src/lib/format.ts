/**
 * Helper format bersama untuk seluruh app (lihat REQUIREMENTS Bagian 8).
 */

/** Format rupiah: Rp10.000 (titik ribuan, tanpa desimal). */
export function formatRupiah(amount: number | null | undefined): string {
  const value = Math.round(amount ?? 0);
  const sign = value < 0 ? '-' : '';
  const digits = Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Rp${digits}`;
}

/**
 * Format nomor telepon Indonesia ke E.164.
 * input `08123...` atau `8123...` atau `+628123...` → `+628123...`
 */
export function toE164(input: string): string {
  const digits = input.replace(/[^\d]/g, '');
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `+62${digits}`;
  return `+${digits}`;
}

/** Tampilan cantik nomor: +62 812-xxxx (mask sebagian tengah). */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/[^\d]/g, '').replace(/^62/, '');
  if (digits.length < 4) return e164;
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `+62 ${head}-xxxx-${tail}`;
}

/** Validasi nomor Indonesia: 9–13 digit setelah 0/62 (yakni bagian setelah +62). */
export function isValidIndoPhone(input: string): boolean {
  const digits = input.replace(/[^\d]/g, '');
  let national = digits;
  if (national.startsWith('62')) national = national.slice(2);
  else if (national.startsWith('0')) national = national.slice(1);
  // national dimulai dengan 8, panjang 9-13
  return /^8\d{8,12}$/.test(national);
}

/** Jarak haversine dalam kilometer. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format jarak: >=1km → "4,3 km"; <1km → "850 m". */
export function formatDistance(km: number): string {
  if (km < 1) {
    const m = Math.round(km * 1000);
    return `${m} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

const DAYS: Record<string, string> = {
  Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min',
};
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Format tanggal+jam zona Asia/Jakarta: "Sel, 15 Sep 2026 • 09.00".
 * Memakai Intl agar konversi zona benar terlepas dari zona device.
 */
export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = get('day');
  const month = MONTHS[Number(get('month')) - 1];
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  // Nama hari langsung dari Intl (Hermes-safe), map ke bahasa Indonesia.
  const weekday = DAYS[get('weekday')] ?? '';
  return `${weekday}, ${day} ${month} ${year} • ${hour}.${minute}`;
}

/** Format jam saja dari "HH:MM:SS" atau Date → "08.00". */
export function formatTimeOnly(time: string): string {
  const [h, m] = time.split(':');
  return `${h?.padStart(2, '0') ?? '00'}.${m?.padStart(2, '0') ?? '00'}`;
}

/** Y-M-D (zona Jakarta) untuk hari ini + offset hari. */
export function wibYmd(daysOffset: number): string {
  const d = new Date(Date.now() + daysOffset * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // en-CA → YYYY-MM-DD
}

/** Bangun timestamptz ISO di zona WIB (+07:00) dari tanggal & jam. */
export function buildScheduledIso(ymd: string, hour: number): string {
  return `${ymd}T${String(hour).padStart(2, '0')}:00:00+07:00`;
}

/** Ambil nama depan. */
export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}
