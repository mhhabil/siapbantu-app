import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, screenPadding, spacing } from '@/theme';
import { Text } from './Text';

export type ScreenHeaderProps = {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
};

export function ScreenHeader({ title, right, onBack }: ScreenHeaderProps) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));

  return (
    <View style={styles.wrap}>
      <Pressable onPress={back} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text variant="h2" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  backBtn: { padding: spacing.xs, marginLeft: -spacing.xs },
  title: { flex: 1 },
  right: { minWidth: 32, alignItems: 'flex-end' },
});
