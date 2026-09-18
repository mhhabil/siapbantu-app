import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, screenPadding } from '@/theme';

export type ScreenProps = {
  children: React.ReactNode;
  /** beri padding horizontal standar (20) */
  padded?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
};

export function Screen({ children, padded = true, edges = ['top', 'bottom'], style }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={[styles.content, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  padded: { paddingHorizontal: screenPadding },
});
