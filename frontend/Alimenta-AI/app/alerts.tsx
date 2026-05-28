import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  View, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStore, Donation } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';

type Severity = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';

function getExpirySeverity(donation: Donation): { severity: Severity; diffDays: number; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(donation.expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let severity: Severity;
  if (diffDays <= 0) {
    severity = 'CRITICO';
  } else if (diffDays <= 2) {
    severity = 'ALTO';
  } else {
    severity = 'MEDIO';
  }

  const label = diffDays <= 0 ? 'Vence HOJE' : diffDays === 1 ? 'Vence em 1 dia' : `Vence em ${diffDays} dias`;

  return { severity, diffDays, label };
}

function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'CRITICO': return '#f44336';
    case 'ALTO': return '#ff9800';
    case 'MEDIO': return '#ffc107';
    case 'BAIXO': return '#4caf50';
  }
}

function getSeverityBg(severity: Severity): string {
  switch (severity) {
    case 'CRITICO': return '#f4433618';
    case 'ALTO': return '#ff980018';
    case 'MEDIO': return '#ffc10718';
    case 'BAIXO': return '#4caf5018';
  }
}

export default function AlertsScreen() {
  const store = useStore();
  const theme = useTheme();

  const [activeFilter, setActiveFilter] = useState<'all' | 'expiry' | 'scarcity' | 'status'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [scanning, setScanning] = useState(false);

  const currentUserId = store.currentUser?.id;
  const currentUserType = store.currentUser?.role;

  useEffect(() => {
    setScanning(true);
    setTimeout(() => {
      store.triggerExpiryAlerts();
      setScanning(false);
    }, 800);
  }, []);

  const allNotifications = store.notifications.filter(n => {
    if (currentUserId && currentUserType) {
      if (n.userType === 'admin' && currentUserType !== 'admin') return false;
      if (n.userType !== 'admin' && n.userId !== currentUserId) {
        return n.userType === currentUserType;
      }
    }
    return true;
  });

  const filteredNotifications = allNotifications.filter(n => {
    if (activeFilter !== 'all' && n.category !== activeFilter) return false;
    if (showUnreadOnly && n.read) return false;
    return true;
  });

  const allDonations = currentUserType === 'admin'
    ? store.donations
    : store.donations.filter(d =>
        (currentUserType === 'donor' && d.donorId === currentUserId) ||
        (currentUserType === 'ngo' && d.matchedNgoId === currentUserId)
      );

  const nearExpiryDonations = allDonations
    .map(d => ({ ...getExpirySeverity(d), donation: d }))
    .filter(item => item.diffDays <= 3)
    .sort((a, b) => a.diffDays - b.diffDays);

  const scarcityAlerts = filteredNotifications.filter(n => n.category === 'scarcity');
  const expiryAlerts = filteredNotifications.filter(n => n.category === 'expiry');
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const criticalCount = nearExpiryDonations.filter(item => item.severity === 'CRITICO').length;
  const highCount = nearExpiryDonations.filter(item => item.severity === 'ALTO').length;

  const handleMarkAllRead = () => {
    allNotifications.filter(n => !n.read).forEach(n => store.markNotificationRead(n.id));
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <SafeAreaView style={styles.safeArea}>
        
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="subtitle">Central de Alertas</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Monitoramento de vencimentos, escassez e notificações
            </ThemedText>
          </View>
          {store.currentUser && (
            <View style={styles.headerActions}>
              <Pressable style={styles.markAllBtn} onPress={handleMarkAllRead}>
                <ThemedText type="code" style={{ color: '#3c87f7', fontSize: 10 }}>Marcar todas lidas</ThemedText>
              </Pressable>
              <Pressable 
                style={styles.backToDashBtn}
                onPress={() => {
                  if (currentUserType === 'donor') router.push('/donor');
                  else if (currentUserType === 'ngo') router.push('/ngo');
                  else router.push('/admin');
                }}
              >
                <ThemedText type="code" style={{ color: '#ffffff', fontSize: 10 }}>Dashboard</ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>

        {scanning && (
          <ThemedView type="backgroundElement" style={styles.scanningBanner}>
            <ActivityIndicator size="small" color="#3c87f7" />
            <ThemedText type="small" style={{ marginLeft: Spacing.two, color: '#3c87f7' }}>
              Verificando doações próximas ao vencimento...
            </ThemedText>
          </ThemedView>
        )}

        {/* KPI Summary Row */}
        <View style={styles.kpiContainer}>
          <ThemedView type="backgroundElement" style={[styles.kpiCard, { borderLeftColor: '#f44336' }]}>
            <View style={styles.kpiIconRow}>
              <SymbolView name="exclamationmark.triangle.fill" size={20} tintColor="#f44336" />
            </View>
            <ThemedText type="subtitle" style={[styles.kpiValue, { color: '#f44336' }]}>{criticalCount}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Críticos (Vence Hoje)</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.kpiCard, { borderLeftColor: '#ff9800' }]}>
            <View style={styles.kpiIconRow}>
              <SymbolView name="clock.fill" size={20} tintColor="#ff9800" />
            </View>
            <ThemedText type="subtitle" style={[styles.kpiValue, { color: '#ff9800' }]}>{nearExpiryDonations.length}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Vence em ≤ 3 dias</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.kpiCard, { borderLeftColor: '#e91e63' }]}>
            <View style={styles.kpiIconRow}>
              <SymbolView name="chart.line.downtrend.xyaxis" size={20} tintColor="#e91e63" />
            </View>
            <ThemedText type="subtitle" style={[styles.kpiValue, { color: '#e91e63' }]}>{scarcityAlerts.length}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Alertas de Escassez</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.kpiCard, { borderLeftColor: '#3c87f7' }]}>
            <View style={styles.kpiIconRow}>
              <SymbolView name="bell.badge.fill" size={20} tintColor="#3c87f7" />
            </View>
            <ThemedText type="subtitle" style={[styles.kpiValue, { color: '#3c87f7' }]}>{unreadCount}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Não Lidas</ThemedText>
          </ThemedView>
        </View>

        {/* Filter Tabs */}
        <ThemedView type="backgroundElement" style={styles.filterContainer}>
          <View style={styles.filterRow}>
            {([
              { key: 'all', label: 'Todas', icon: 'tray.full' },
              { key: 'expiry', label: 'Vencimento', icon: 'clock.badge.exclamationmark' },
              { key: 'scarcity', label: 'Escassez', icon: 'chart.line.downtrend.xyaxis' },
              { key: 'status', label: 'Status', icon: 'arrow.triangle.swap' },
            ] as const).map(f => (
              <Pressable
                key={f.key}
                style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <SymbolView 
                  name={f.icon} 
                  size={14} 
                  tintColor={activeFilter === f.key ? '#ffffff' : theme.textSecondary}
                />
                <ThemedText type="code" style={[styles.filterBtnText, activeFilter === f.key && { color: '#ffffff' }]}>
                  {f.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <Pressable 
            style={[styles.toggleUnreadBtn, showUnreadOnly && styles.toggleUnreadActive]}
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <SymbolView 
              name={showUnreadOnly ? 'eye.slash.fill' : 'eye.fill'} 
              size={14} 
              tintColor={showUnreadOnly ? '#ffffff' : '#ff9800'}
            />
            <ThemedText type="code" style={[styles.toggleUnreadText, showUnreadOnly && { color: '#ffffff' }]}>
              {showUnreadOnly ? 'Não lidas' : 'Todas'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* SECTION 1: NEAR EXPIRY DONATIONS */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="clock.badge.exclamationmark.fill" size={18} tintColor="#f44336" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Doações Próximas ao Vencimento ({nearExpiryDonations.length})</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardDesc}>
            Itens com data de validade em até 3 dias. Priorize a coleta dos itens críticos (vencem hoje).
          </ThemedText>

          {nearExpiryDonations.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhuma doação próxima ao vencimento detectada.
            </ThemedText>
          ) : (
            <View style={styles.expiryList}>
              {nearExpiryDonations.map(({ donation, severity, label }) => (
                <ThemedView 
                  key={donation.id} 
                  type="backgroundSelected" 
                  style={[styles.expiryCard, { borderLeftColor: getSeverityColor(severity) }]}
                >
                  <View style={styles.expiryCardHeader}>
                    <View style={[styles.expirySeverityBadge, { backgroundColor: getSeverityBg(severity) }]}>
                      <View style={[styles.severityDot, { backgroundColor: getSeverityColor(severity) }]} />
                      <ThemedText type="code" style={[styles.severityText, { color: getSeverityColor(severity) }]}>
                        {severity}
                      </ThemedText>
                    </View>
                    <ThemedText type="code" style={[styles.expiryDays, { color: getSeverityColor(severity) }]}>
                      {label.toUpperCase()}
                    </ThemedText>
                  </View>

                  <View style={styles.expiryBody}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{donation.name}</ThemedText>
                      <ThemedText type="small" style={{ fontSize: 13, marginTop: 2 }}>
                        {donation.quantity} • {donation.donorName} • {donation.storageConditions}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                        Validade: {donation.expiryDate} • Status: {donation.status}
                      </ThemedText>
                    </View>

                    {donation.matchedNgoName && (
                      <View style={styles.expiryNgoTag}>
                        <SymbolView name="building.2" size={12} tintColor="#ff9800" />
                        <ThemedText type="code" style={{ fontSize: 9, color: '#ff9800', marginLeft: 4 }}>
                          {donation.matchedNgoName}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={styles.expiryProgressTrack}>
                    <View 
                      style={[
                        styles.expiryProgressFill,
                        { 
                          backgroundColor: getSeverityColor(severity),
                          width: `${Math.max(5, Math.min(100, (1 - severity === 'CRITICO' ? 0.05 : severity === 'ALTO' ? 0.15 : 0.3) * 100))}%`,
                        },
                      ]} 
                    />
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </ThemedView>

        {/* SECTION 2: SCARCITY PREDICTIVE ALERTS */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="chart.line.downtrend.xyaxis" size={18} tintColor="#e91e63" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Alertas Preditivos de Escassez ({scarcityAlerts.length})</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardDesc}>
            Disparado automaticamente quando a demanda prevista de uma ONG supera em 30% o volume de doações ativas destinadas a ela.
          </ThemedText>

          {scarcityAlerts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhum alerta de escassez ativo no momento.
            </ThemedText>
          ) : (
            <View style={styles.scarcityList}>
              {scarcityAlerts.map(alert => (
                <Pressable
                  key={alert.id}
                  onPress={() => store.markNotificationRead(alert.id)}
                  style={[styles.scarcityCard, !alert.read && styles.scarcityUnread]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.scarcityHeader}>
                      <SymbolView name="exclamationmark.triangle.fill" size={14} tintColor="#e91e63" />
                      <ThemedText type="smallBold" style={[styles.scarcityTitle, !alert.read && { color: '#e91e63' }]}>
                        {alert.title}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ fontSize: 13, marginTop: 2 }}>
                      {alert.message}
                    </ThemedText>
                    <ThemedText type="code" style={{ fontSize: 9, opacity: 0.5, marginTop: 4 }}>
                      {new Date(alert.timestamp).toLocaleDateString('pt-BR')} às {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                  {!alert.read && <View style={styles.unreadDot} />}
                </Pressable>
              ))}
            </View>
          )}
        </ThemedView>

        {/* SECTION 3: ALL NOTIFICATIONS FEED */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="bell.fill" size={18} tintColor="#3c87f7" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>
              Feed de Notificações ({filteredNotifications.length})
            </ThemedText>
            <View style={{ marginLeft: 'auto' }}>
              <ThemedText type="code" style={{ fontSize: 10, opacity: 0.5 }}>
                {activeFilter !== 'all' ? `Filtro: ${activeFilter}` : 'Todas as categorias'}
              </ThemedText>
            </View>
          </View>

          {filteredNotifications.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhuma notificação encontrada com os filtros atuais.
            </ThemedText>
          ) : (
            <View style={styles.notifList}>
              {filteredNotifications
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(notif => (
                  <Pressable
                    key={notif.id}
                    onPress={() => store.markNotificationRead(notif.id)}
                    style={[styles.notifCard, !notif.read && styles.notifUnread, { borderBottomColor: theme.backgroundSelected }]}
                  >
                    <View style={styles.notifLeft}>
                      <View style={[styles.notifCatIcon, { backgroundColor: getNotifCatColor(notif.category) + '20' }]}>
                        <SymbolView 
                          name={getNotifCatIcon(notif.category)} 
                          size={16} 
                          tintColor={getNotifCatColor(notif.category)}
                        />
                      </View>
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.notifTopRow}>
                        <ThemedText type="smallBold" style={!notif.read ? { color: getNotifCatColor(notif.category) } : undefined} numberOfLines={1}>
                          {notif.title}
                        </ThemedText>
                        <ThemedText type="code" style={styles.notifCatBadge}>
                          {notif.category.toUpperCase()}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                        {notif.message}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 9, opacity: 0.5, marginTop: 4 }}>
                        {new Date(notif.timestamp).toLocaleDateString('pt-BR')} às {new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </ThemedText>
                    </View>

                    {!notif.read && <View style={styles.unreadDot} />}
                  </Pressable>
                ))}
            </View>
          )}
        </ThemedView>

      </SafeAreaView>
    </ScrollView>
  );
}

function getNotifCatColor(category: string): string {
  switch (category) {
    case 'expiry': return '#f44336';
    case 'scarcity': return '#e91e63';
    case 'status': return '#4caf50';
    case 'system': return '#3c87f7';
    default: return '#757575';
  }
}

function getNotifCatIcon(category: string): string {
  switch (category) {
    case 'expiry': return 'clock.badge.exclamationmark';
    case 'scarcity': return 'chart.line.downtrend.xyaxis';
    case 'status': return 'arrow.triangle.swap';
    case 'system': return 'gearshape.fill';
    default: return 'bell';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.five,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  markAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
  },
  backToDashBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#3c87f7',
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.06)',
  },
  kpiIconRow: {
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 8,
    opacity: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  filterContainer: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.12)',
  },
  filterBtnActive: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  filterBtnText: {
    fontSize: 10,
    opacity: 0.7,
  },
  toggleUnreadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: '#ff980040',
  },
  toggleUnreadActive: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  toggleUnreadText: {
    fontSize: 10,
    color: '#ff9800',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    padding: Spacing.three,
  },
  expiryList: {
    gap: Spacing.two,
  },
  expiryCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 4,
    gap: Spacing.two,
  },
  expiryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expirySeverityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  expiryDays: {
    fontSize: 10,
    fontWeight: '700',
  },
  expiryBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expiryNgoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff980010',
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: '#ff980030',
  },
  expiryProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  expiryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scarcityList: {
    gap: Spacing.two,
  },
  scarcityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: '#e91e63',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.06)',
  },
  scarcityUnread: {
    backgroundColor: '#e91e6308',
  },
  scarcityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scarcityTitle: {
    fontSize: 14,
    flexShrink: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3c87f7',
    marginLeft: Spacing.two,
    marginTop: 4,
  },
  notifList: {
    gap: Spacing.one,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: 1,
  },
  notifUnread: {
    borderLeftWidth: 2,
    borderLeftColor: '#3c87f7',
    paddingLeft: Spacing.two - 2,
  },
  notifLeft: {
    marginRight: Spacing.two,
  },
  notifCatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBody: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.one,
  },
  notifCatBadge: {
    fontSize: 8,
    opacity: 0.5,
    backgroundColor: 'rgba(150,150,150,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
});
