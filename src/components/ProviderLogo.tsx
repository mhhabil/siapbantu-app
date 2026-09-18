import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { Text } from './Text';

export type ProviderLogoProps = {
  name: string;
  logoUrl?: string | null;
  size?: number;
};

/** Logo penyedia; jika kosong tampilkan inisial di rounded square primarySoft. */
export function ProviderLogo({ name, logoUrl, size = 56 }: ProviderLogoProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: radius.icon }}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <Text variant="h2" color={colors.primary}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: radius.icon,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
