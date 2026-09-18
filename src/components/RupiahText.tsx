import { formatRupiah } from '@/lib/format';
import { Text, type TextProps } from './Text';

export type RupiahTextProps = Omit<TextProps, 'children'> & {
  value: number | null | undefined;
};

/** Menampilkan nominal rupiah dengan format seragam. */
export function RupiahText({ value, ...rest }: RupiahTextProps) {
  return <Text {...rest}>{formatRupiah(value)}</Text>;
}
