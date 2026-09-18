import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

export type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Konten tambahan (mis. input alasan) di antara pesan dan tombol. */
  children?: React.ReactNode;
};

/** Dialog konfirmasi standar (bukan balon chat) — lihat S07/S10/S15. */
export function Dialog({
  visible,
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={loading ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text variant="h2">{title}</Text>
          {message ? (
            <Text variant="body" color={colors.textSecondary}>
              {message}
            </Text>
          ) : null}
          {children}
          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              disabled={loading}
              style={styles.btn}
            />
            <Button
              title={confirmLabel}
              variant={confirmVariant}
              onPress={onConfirm}
              loading={loading}
              style={styles.btn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.dialog,
    padding: spacing.xl,
    gap: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1 },
});
