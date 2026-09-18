import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Terjadi kesalahan',
  description = 'Gagal memuat data. Periksa koneksi lalu coba lagi.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text variant="h2" center>
        {title}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} center>
        {description}
      </Text>
      {onRetry ? (
        <Button title="Coba Lagi" variant="secondary" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
