/**
 * SiapBantu design tokens (lihat REQUIREMENTS Bagian 9).
 * Light mode saja untuk MVP.
 */

export const colors = {
  // Brand
  primary: '#1D6FE0', // tombol utama, link, tab aktif, ikon kategori
  primaryPressed: '#1558B8', // state ditekan
  primarySoft: '#E8F1FD', // latar ikon kategori, kartu terpilih, chip aktif
  navy: '#0F2E6B', // tombol chat melayang, header gelombang, judul brand

  // Netral
  background: '#F7F9FC', // latar layar
  surface: '#FFFFFF', // kartu, bottom sheet, input
  border: '#E2E8F0', // garis kartu & input
  borderStrong: '#CBD5E1', // input fokus-nonaktif, divider tebal
  text: '#0F172A', // teks utama
  textSecondary: '#475569', // teks pendukung (deskripsi, tanggal)
  textMuted: '#94A3B8', // placeholder & elemen disabled saja
  disabledBg: '#E2E8F0',

  // Status (teks + latar)
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  neutral: '#475569',
  neutralSoft: '#F1F5F9',

  // Khusus
  star: '#F59E0B', // bintang rating
  whatsapp: '#25D366', // hanya untuk ikon WhatsApp
  overlay: 'rgba(15, 23, 42, 0.5)', // latar belakang dialog
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  card: 12,
  input: 12,
  icon: 16,
  dialog: 16,
  pill: 999,
} as const;

export const screenPadding = 20;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/** Skala tipografi (lihat 9.4). fontFamily dipilih sesuai bobot. */
export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontFamily: fonts.bold },
  h1: { fontSize: 24, lineHeight: 32, fontFamily: fonts.bold },
  h2: { fontSize: 18, lineHeight: 26, fontFamily: fonts.bold },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.medium },
  bodySmall: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
  label: { fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold },
} as const;

export const theme = { colors, spacing, radius, screenPadding, fonts, typography };
export type Theme = typeof theme;
