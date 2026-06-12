import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { useNotifications } from '@/hooks/useNotifications';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

/**
 * Sino minimalista com badge numerico e popover de notificacoes.
 * - Web: dropdown absoluto ancorado ao sino, click fora fecha.
 * - Mobile: Modal nativo full-width com header + lista + fechar.
 */
export function NotificationBell() {
  const { notifs, isLoading, markRead, refresh } = useNotifications({
    autoRefresh: true,
    intervalMs: 30_000,
  });
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const router = useRouter();
  const containerRef = useRef<View | null>(null);

  const unread = notifs.filter(n => !n.read);
  const unreadCount = unread.length;
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  // Click-outside (web)
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      // Find the bell container by ref-equivalent
      if (containerRef.current && target) {
        // containerRef.current is a RN View; in DOM it maps to the host <div>
        // We check via closest() using a marker className
        const el = target as HTMLElement;
        if (el?.closest && !el.closest('[data-notif-bell]')) {
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleOpen = useCallback(() => {
    setOpen(prev => !prev);
    refresh();
  }, [refresh]);

  const handleItemPress = useCallback(
    async (id: number, relatedDonationId: number | null) => {
      await markRead(id);
      setOpen(false);
      if (relatedDonationId) {
        // Navega para raiz - cada tipo de user cai na sua pagina
        router.push('/');
      }
    },
    [markRead, router]
  );

  return (
    <View ref={containerRef} style={styles.wrapper} {...({ 'data-notif-bell': '' } as object)}>
      <Pressable
        onPress={handleOpen}
        hitSlop={8}
        style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.6 }]}
        accessibilityLabel={`Notificacoes${unreadCount > 0 ? `, ${unreadCount} nao lidas` : ''}`}
      >
        <SymbolView
          name={unreadCount > 0 ? 'bell.fill' : 'bell'}
          size={20}
          tintColor={theme.text}
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        )}
      </Pressable>

      {Platform.OS === 'web' ? (
        // Web: dropdown anchored to bell
        open && (
          <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={styles.dropdownHeader}>
              <ThemedText type="smallBold">Notificacoes</ThemedText>
              {unreadCount > 0 && (
                <ThemedText type="code" themeColor="textSecondary" style={{ fontSize: 11 }}>
                  {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                </ThemedText>
              )}
            </View>

            {isLoading && notifs.length === 0 ? (
              <ActivityIndicator style={{ padding: Spacing.three }} color="#3c87f7" />
            ) : notifs.length === 0 ? (
              <View style={styles.emptyState}>
                <SymbolView name="bell.slash" size={28} tintColor={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
                  Nenhuma notificacao
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {unread.map(n => (
                  <Pressable
                    key={n.id}
                    onPress={() => handleItemPress(n.id, n.related_donation_id)}
                    style={({ pressed }) => [
                      styles.item,
                      { borderBottomColor: theme.backgroundSelected },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={styles.itemContent}>
                      <View style={styles.unreadDot} />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" numberOfLines={1} style={{ color: '#3c87f7' }}>
                          {n.title}
                        </ThemedText>
                        <ThemedText type="small" numberOfLines={2} style={{ fontSize: 12, marginTop: 2 }}>
                          {n.message}
                        </ThemedText>
                        <ThemedText type="code" themeColor="textSecondary" style={{ fontSize: 10, marginTop: 4 }}>
                          {formatRelativeTime(n.timestamp)}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )
      ) : (
        // Mobile: Modal nativo (bottom sheet-style)
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <Pressable
              style={[styles.bottomSheet, { backgroundColor: theme.background }]}
              onPress={() => {}}
            >
              <View style={[styles.bottomSheetHandle, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.bottomSheetHeader}>
                <ThemedText type="subtitle">Notificacoes</ThemedText>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <SymbolView name="xmark" size={20} tintColor={theme.text} />
                </Pressable>
              </View>

              {isLoading && notifs.length === 0 ? (
                <ActivityIndicator style={{ padding: Spacing.four }} color="#3c87f7" />
              ) : notifs.length === 0 ? (
                <View style={styles.emptyState}>
                  <SymbolView name="bell.slash" size={32} tintColor={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
                    Nenhuma notificacao
                  </ThemedText>
                </View>
              ) : (
                <ScrollView style={styles.bottomList}>
                  {unread.map(n => (
                    <Pressable
                      key={n.id}
                      onPress={() => handleItemPress(n.id, n.related_donation_id)}
                      style={({ pressed }) => [
                        styles.mobileItem,
                        { borderBottomColor: theme.backgroundSelected },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <View style={styles.itemContent}>
                        <View style={styles.unreadDot} />
                        <View style={{ flex: 1 }}>
                          <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>
                            {n.title}
                          </ThemedText>
                          <ThemedText type="small" style={{ fontSize: 13, marginTop: 2 }}>
                            {n.message}
                          </ThemedText>
                          <ThemedText type="code" themeColor="textSecondary" style={{ fontSize: 10, marginTop: 4 }}>
                            {formatRelativeTime(n.timestamp)}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atras`;
  return date.toLocaleDateString('pt-BR');
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  bellBtn: {
    padding: Spacing.one,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  // Web dropdown
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: Spacing.one,
    width: 320,
    maxHeight: 480,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  list: {
    maxHeight: 400,
  },
  item: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  itemContent: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3c87f7',
    marginTop: 6,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
  // Mobile bottom sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: Spacing.four,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  bottomList: {
    maxHeight: '100%',
  },
  mobileItem: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
});
