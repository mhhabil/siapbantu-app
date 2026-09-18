import { formatDateTime } from '@/lib/format';
import { colors } from '@/theme';

export type TimelineStep = { label: string; time?: string; state: 'done' | 'active' | 'next' };

export type OrderStatus =
  | 'awaiting_deposit'
  | 'verifying_deposit'
  | 'awaiting_payment'
  | 'verifying_payment'
  | 'awaiting_provider'
  | 'on_the_way'
  | 'in_progress'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export type PaymentType = 'deposit' | 'upfront';

type StatusMeta = {
  label: string;
  /** warna teks & latar untuk badge/banner (lihat 9.2) */
  fg: string;
  bg: string;
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  awaiting_deposit: { label: 'Menunggu Pembayaran Deposit', fg: colors.warning, bg: colors.warningSoft },
  verifying_deposit: { label: 'Deposit Sedang Diverifikasi', fg: colors.neutral, bg: colors.neutralSoft },
  awaiting_payment: { label: 'Menunggu Pembayaran', fg: colors.warning, bg: colors.warningSoft },
  verifying_payment: { label: 'Pembayaran Sedang Diverifikasi', fg: colors.neutral, bg: colors.neutralSoft },
  awaiting_provider: { label: 'Menunggu Konfirmasi Penyedia', fg: colors.neutral, bg: colors.neutralSoft },
  on_the_way: { label: 'Penyedia Menuju Rumahmu', fg: colors.info, bg: colors.infoSoft },
  in_progress: { label: 'Sedang Dikerjakan', fg: colors.info, bg: colors.infoSoft },
  delivering: { label: 'Sedang Diantar', fg: colors.info, bg: colors.infoSoft },
  completed: { label: 'Selesai', fg: colors.success, bg: colors.successSoft },
  cancelled: { label: 'Dibatalkan', fg: colors.danger, bg: colors.dangerSoft },
};

/** Status yang butuh tindakan bayar dari user (untuk kartu Tagihan di Beranda). */
export const NEEDS_PAYMENT: OrderStatus[] = ['awaiting_deposit', 'awaiting_payment'];

/** Status yang dianggap "aktif" (bukan selesai/batal). */
export const ACTIVE_STATUSES: OrderStatus[] = [
  'awaiting_deposit',
  'verifying_deposit',
  'awaiting_payment',
  'verifying_payment',
  'awaiting_provider',
  'on_the_way',
  'in_progress',
  'delivering',
];

/** Urutan langkah timeline sesuai tipe pembayaran (lihat 5.2 / 5.3). */
export function timelineSteps(paymentType: PaymentType): OrderStatus[] {
  if (paymentType === 'deposit') {
    return [
      'awaiting_deposit',
      'verifying_deposit',
      'awaiting_provider',
      'on_the_way',
      'awaiting_payment',
      'verifying_payment',
      'in_progress',
      'delivering',
      'completed',
    ];
  }
  return [
    'awaiting_payment',
    'verifying_payment',
    'awaiting_provider',
    'on_the_way',
    'in_progress',
    'delivering',
    'completed',
  ];
}

/** Apakah user boleh membatalkan pada status ini (aturan 5.4). */
export function canUserCancel(paymentType: PaymentType, status: OrderStatus): boolean {
  if (paymentType === 'deposit') {
    return ['awaiting_deposit', 'verifying_deposit', 'awaiting_provider'].includes(status);
  }
  return ['awaiting_payment', 'verifying_payment', 'awaiting_provider'].includes(status);
}

/** Bangun langkah timeline (done/active/next) + waktu dari log. */
export function buildTimeline(
  paymentType: PaymentType,
  currentStatus: OrderStatus,
  logs: { status: string; created_at: string }[]
): TimelineStep[] {
  const steps = timelineSteps(paymentType);
  const timeOf = (status: string): string | undefined => {
    const log = logs.find((l) => l.status === status);
    return log ? formatDateTime(log.created_at) : undefined;
  };
  const currentIndex = steps.indexOf(currentStatus);
  return steps.map((status, idx) => {
    let state: TimelineStep['state'] = 'next';
    if (currentIndex >= 0) {
      if (idx < currentIndex) state = 'done';
      else if (idx === currentIndex) state = 'active';
    }
    return { label: ORDER_STATUS[status].label, time: state === 'done' || state === 'active' ? timeOf(status) : undefined, state };
  });
}
