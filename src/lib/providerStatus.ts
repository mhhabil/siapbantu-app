import { colors } from '@/theme';
import { formatTimeOnly } from './format';

export type ProviderAvailability = {
  kind: 'available' | 'closed' | 'unavailable';
  label: string;
  fg: string;
  bg: string;
  /** true hanya jika penyedia bisa dipesan */
  bookable: boolean;
};

type ProviderLike = {
  is_available: boolean;
  open_time: string | null;
  close_time: string | null;
};

/** Jam sekarang (HH:MM:SS) di zona Asia/Jakarta. */
function nowJakartaTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** Hitung status tampilan penyedia (lihat REQUIREMENTS 4.3). */
export function computeAvailability(p: ProviderLike): ProviderAvailability {
  if (!p.is_available) {
    return { kind: 'unavailable', label: 'Tidak Tersedia', fg: colors.danger, bg: colors.dangerSoft, bookable: false };
  }
  if (p.open_time && p.close_time) {
    const now = nowJakartaTime();
    const open = p.open_time.length === 5 ? `${p.open_time}:00` : p.open_time;
    const close = p.close_time.length === 5 ? `${p.close_time}:00` : p.close_time;
    const withinHours = now >= open && now <= close;
    if (!withinHours) {
      return {
        kind: 'closed',
        label: `Buka pukul ${formatTimeOnly(p.open_time)}`,
        fg: colors.neutral,
        bg: colors.neutralSoft,
        bookable: false,
      };
    }
  }
  return { kind: 'available', label: 'Tersedia', fg: colors.success, bg: colors.successSoft, bookable: true };
}
