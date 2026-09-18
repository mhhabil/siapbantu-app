import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useSubmitReview } from '@/hooks/useOrders';
import { colors, screenPadding, spacing } from '@/theme';

const MAX_COMMENT = 500;

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const submit = useSubmitReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (rating < 1) return;
    setError(null);
    try {
      await submit.mutateAsync({ orderId, rating, comment: comment.trim() || undefined });
      showToast('Terima kasih atas ulasanmu', 'success');
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: '/order/[id]', params: { id: orderId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim ulasan.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Beri Rating" />
      <View style={styles.content}>
        <Text variant="h2" center>
          Seberapa puas kamu?
        </Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={40}
                color={n <= rating ? colors.star : colors.borderStrong}
              />
            </Pressable>
          ))}
        </View>

        <Input
          label="Komentar (opsional)"
          value={comment}
          onChangeText={(t) => setComment(t.slice(0, MAX_COMMENT))}
          placeholder="Ceritakan pengalamanmu…"
          multiline
          style={styles.multiline}
        />
        <Text variant="bodySmall" color={colors.textMuted} style={styles.counter}>
          {comment.length}/{MAX_COMMENT}
        </Text>

        {error ? (
          <Text variant="bodySmall" color={colors.danger}>
            {error}
          </Text>
        ) : null}

        <Button title="Kirim" onPress={onSubmit} disabled={rating < 1} loading={submit.isPending} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.xl, gap: spacing.lg },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  counter: { textAlign: 'right', marginTop: -spacing.md },
});
