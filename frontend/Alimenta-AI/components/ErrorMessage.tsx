import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <SymbolView name="exclamationmark.triangle.fill" size={32} tintColor="#f44336" />
      <ThemedText type="small" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <ThemedText type="code" style={styles.retryText}>
            Tentar novamente
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    borderRadius: Spacing.three,
    marginVertical: Spacing.four,
    gap: Spacing.two,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  retryBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
