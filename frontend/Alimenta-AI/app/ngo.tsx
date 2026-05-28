import React, { useState } from 'react';
import { 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  View, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStore, Donation, DonationStatus } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';

const FOOD_PHOTOS = [
  { id: 'tomatoes', name: 'Tomates', emoji: '🍅', color: '#ff5252' },
  { id: 'bread', name: 'Pão Caseiro', emoji: '🍞', color: '#ffa726' },
  { id: 'oranges', name: 'Laranjas', emoji: '🍊', color: '#ffb74d' },
  { id: 'milk', name: 'Leite Longa Vida', emoji: '🥛', color: '#e0e0e0' },
  { id: 'vegetables', name: 'Cesta de Verduras', emoji: '🥬', color: '#81c784' },
  { id: 'meats', name: 'Carne Bovina', emoji: '🥩', color: '#e57373' },
];

const LIFECYCLE_STATES: DonationStatus[] = [
  'Cadastrado',
  'Analisado',
  'Matched',
  'Notificado',
  'Coletado',
  'Confirmado'
];

export default function NgoScreen() {
  const store = useStore();
  const theme = useTheme();

  // Route protection - check if user is ngo
  const isNgoLoggedIn = !!(store.currentUser && store.currentUser.role === 'ngo');
  const activeNgoId = isNgoLoggedIn && store.currentUser ? store.currentUser.id : 'ngo_1';
  const activeNgoName = isNgoLoggedIn && store.currentUser ? store.currentUser.name : 'ONG Prato Cheio';

  const currentNgo = store.ngos.find(n => n.id === activeNgoId) || store.ngos[0];

  // Selected donation for state transition manager
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  
  // Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter donations and notifications for this specific NGO
  // Display only matched donations
  const matchedDonations = store.donations.filter(d => d.matchedNgoId === activeNgoId);
  const ngoNotifications = store.notifications.filter(n => n.userId === activeNgoId);

  // Active selected donation object
  const selectedDonation = store.donations.find(d => d.id === selectedDonationId);

  // Stats calculation
  const totalReceivedWeight = matchedDonations
    .filter(d => d.status === 'Confirmado')
    .reduce((acc, d) => acc + (parseFloat(d.quantity) || 0), 0);

  const pendingCollectionsCount = matchedDonations
    .filter(d => ['Matched', 'Notificado', 'Coletado'].includes(d.status))
    .length;

  const handleUpdateState = (nextState: DonationStatus) => {
    if (!selectedDonationId) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    setTimeout(() => {
      try {
        store.updateDonationState(
          selectedDonationId, 
          nextState, 
          activeNgoName, 
          transitionNotes || undefined
        );
        setSuccessMsg(`Status atualizado para "${nextState}" com sucesso!`);
        setTransitionNotes('');
        setLoading(false);
        // Clear message
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(err.message || 'Falha ao atualizar estado.');
      }
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cadastrado': return '#2196f3';
      case 'Analisado': return '#9c27b0';
      case 'Matched': return '#ff9800';
      case 'Notificado': return '#e91e63';
      case 'Coletado': return '#4caf50';
      case 'Confirmado': return '#2e7d32';
      case 'Cancelado': return '#f44336';
      default: return '#757575';
    }
  };

  // Met vs Predicted Demand Report simulation data (RF-24)
  // We compare history weekly attendance against capacity and forecasted demand
  const weeklyLabels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5 (Prevista)'];
  const actualHistory = [...currentNgo.history];
  const predictedValue = currentNgo.predictedDemand;
  
  // Combine into a single array for visualization
  const graphValues = [...actualHistory, predictedValue];
  const maxGraphVal = Math.max(...graphValues, currentNgo.capacity) * 1.1;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* Welcome Header */}
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="subtitle">Portal da ONG</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Conectado: <ThemedText type="smallBold">{activeNgoName}</ThemedText>
            </ThemedText>
          </View>
          {!isNgoLoggedIn && (
            <Pressable style={styles.loginHintBtn} onPress={() => router.replace('/')}>
              <ThemedText type="code" style={{ color: '#ffffff', fontSize: 11 }}>Fazer Login</ThemedText>
            </Pressable>
          )}
        </ThemedView>

        {/* Dashboard Metrics (RF-23) */}
        <View style={styles.kpiContainer}>
          <ThemedView type="backgroundElement" style={styles.kpiCard}>
            <SymbolView name="cart.badge.plus" size={24} tintColor="#4caf50" />
            <ThemedText type="subtitle" style={styles.kpiValue}>{totalReceivedWeight} kg</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Total Confirmado</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.kpiCard}>
            <SymbolView name="bell.badge" size={24} tintColor="#e91e63" />
            <ThemedText type="subtitle" style={styles.kpiValue}>{pendingCollectionsCount}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Agendados p/ Coleta</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.kpiCard}>
            <SymbolView name="person.3.fill" size={24} tintColor="#2196f3" />
            <ThemedText type="subtitle" style={styles.kpiValue}>{currentNgo.capacity}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Capacidade Semanal</ThemedText>
          </ThemedView>
        </View>

        {/* MET VS PREDICTED DEMAND CHART (RF-24, RF-11, RF-13) */}
        <ThemedView type="backgroundElement" style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <SymbolView name="chart.bar.xaxis" size={20} tintColor="#2196f3" />
            <View style={{ marginLeft: Spacing.one }}>
              <ThemedText type="smallBold">Relatório Periódico: Demanda vs Prevista</ThemedText>
              <ThemedText type="code" style={{ fontSize: 9, opacity: 0.7 }}>
                Motor statsforecast (AutoETS / AutoARIMA) • Atualizado quinzenalmente
              </ThemedText>
            </View>
          </View>

          {/* Custom SVG/HTML Chart in React Native */}
          <View style={styles.chartBody}>
            <View style={styles.chartYAxis}>
              <ThemedText type="code" style={styles.yAxisLabel}>{Math.round(maxGraphVal)}</ThemedText>
              <ThemedText type="code" style={styles.yAxisLabel}>{Math.round(maxGraphVal * 0.66)}</ThemedText>
              <ThemedText type="code" style={styles.yAxisLabel}>{Math.round(maxGraphVal * 0.33)}</ThemedText>
              <ThemedText type="code" style={styles.yAxisLabel}>0</ThemedText>
            </View>

            <View style={styles.chartBarsArea}>
              {graphValues.map((val, idx) => {
                const isPrediction = idx === graphValues.length - 1;
                const barHeightPct = (val / maxGraphVal) * 100;
                return (
                  <View key={idx} style={styles.chartBarCol}>
                    <View style={styles.barOuter}>
                      <View 
                        style={[
                          styles.barInner, 
                          { height: `${barHeightPct}%` },
                          isPrediction ? styles.barPrediction : styles.barActual
                        ]} 
                      />
                      <ThemedText type="code" style={styles.barValueLabel}>{val}</ThemedText>
                    </View>
                    <ThemedText type="code" style={styles.barLabel}>{weeklyLabels[idx]}</ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#3c87f7' }]} />
              <ThemedText type="code" style={{ fontSize: 10 }}>Atendimento Histórico Real</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#9c27b0' }]} />
              <ThemedText type="code" style={{ fontSize: 10 }}>Demanda Prevista (ML)</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* SUGGESTED MATCHING LIST (RF-17, RF-18) */}
        <ThemedView type="backgroundElement" style={styles.listContainer}>
          <ThemedText type="smallBold" style={styles.listTitle}>Doações Direcionadas (Matching Inteligente)</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.listDesc}>
            Lista ordenada automaticamente por prioridade calculada em tempo real (Distância + Perecibilidade + Escassez).
          </ThemedText>

          {matchedDonations.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyListText}>
              Nenhuma doação compatível com seu perfil no momento.
            </ThemedText>
          ) : (
            <View style={styles.matchedList}>
              {matchedDonations
                .slice()
                // Sort by match score descending
                .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                .map(donation => {
                  const photo = FOOD_PHOTOS.find(p => p.id === donation.photoUrl) || FOOD_PHOTOS[4];
                  const isSelected = selectedDonationId === donation.id;
                  
                  return (
                    <Pressable 
                      key={donation.id}
                      onPress={() => {
                        setSelectedDonationId(isSelected ? null : donation.id);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      style={[
                        styles.matchCard, 
                        isSelected && { borderColor: '#ff9800', borderWidth: 2 },
                        { backgroundColor: theme.backgroundSelected }
                      ]}
                    >
                      <View style={styles.matchCardRow}>
                        <View style={[styles.emojiCircle, { backgroundColor: photo.color + '22' }]}>
                          <ThemedText style={{ fontSize: 28 }}>{photo.emoji}</ThemedText>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={styles.matchCardHeader}>
                            <ThemedText type="smallBold" style={{ flex: 1 }}>{donation.name}</ThemedText>
                            <View style={styles.priorityScoreBadge}>
                              <ThemedText type="code" style={styles.scoreText}>
                                Score {donation.matchScore || 0}
                              </ThemedText>
                            </View>
                          </View>
                          
                          <ThemedText type="code" style={styles.matchDesc}>
                            Qtd: {donation.quantity} • Doador: {donation.donorName}
                          </ThemedText>

                          <View style={styles.matchMetaRow}>
                            <SymbolView name="location" size={11} tintColor={theme.textSecondary} />
                            <ThemedText type="code" style={styles.metaText}>
                              Distância: {store.currentUser ? '1.2 km' : 'Calculando...'}
                            </ThemedText>
                            <View style={styles.metaDot} />
                            <SymbolView name="calendar" size={11} tintColor={theme.textSecondary} />
                            <ThemedText type="code" style={styles.metaText}>
                              Vence em: {donation.expiryDate}
                            </ThemedText>
                          </View>
                        </View>
                      </View>

                      {/* Timeline & AFD State Transition Controller (RF-19, RF-20, RF-21) */}
                      {isSelected && (
                        <ThemedView type="backgroundElement" style={styles.stateTransitionArea}>
                          <ThemedText type="smallBold" style={styles.sectionSubTitle}>Histórico de Ciclo de Vida da Doação (AFD - RF-19)</ThemedText>
                          
                          {/* Horizontal Timeline view of state machine */}
                          <View style={styles.timelineWrapper}>
                            {LIFECYCLE_STATES.map((stateName, index) => {
                              const historyEntry = donation.history.find(h => h.status === stateName);
                              const isCompleted = !!historyEntry;
                              const isActive = donation.status === stateName;
                              
                              return (
                                <React.Fragment key={stateName}>
                                  <View style={styles.timelineNodeCol}>
                                    <View 
                                      style={[
                                        styles.timelineDot, 
                                        isCompleted && styles.timelineDotDone,
                                        isActive && styles.timelineDotActive
                                      ]}
                                    >
                                      {isCompleted && (
                                        <SymbolView name="checkmark" size={10} tintColor="#ffffff" />
                                      )}
                                    </View>
                                    <ThemedText type="code" style={[styles.timelineNodeLabel, isActive && { fontWeight: 'bold', color: '#3c87f7' }]}>
                                      {stateName}
                                    </ThemedText>
                                    {historyEntry && (
                                      <ThemedText type="code" style={styles.timelineTimeLabel}>
                                        {new Date(historyEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </ThemedText>
                                    )}
                                  </View>
                                  {index < LIFECYCLE_STATES.length - 1 && (
                                    <View style={[styles.timelineLinkLine, isCompleted && styles.timelineLinkLineDone]} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </View>

                          {/* Rejection / Success Banners inside timeline */}
                          {errorMsg !== '' && (
                            <View style={styles.errorTimelineBanner}><ThemedText type="small" style={{ color: '#ffffff' }}>{errorMsg}</ThemedText></View>
                          )}
                          {successMsg !== '' && (
                            <View style={styles.successTimelineBanner}><ThemedText type="small" style={{ color: '#ffffff' }}>{successMsg}</ThemedText></View>
                          )}

                          {/* Control Buttons for state updates */}
                          <ThemedText type="smallBold" style={styles.controlLabel}>Atualizar Fluxo da Coleta:</ThemedText>
                          
                          <TextInput 
                            style={[styles.transitionInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                            placeholder="Adicione observações da transição (ex: Coletado pelo motorista Pedro)"
                            placeholderTextColor={theme.textSecondary}
                            value={transitionNotes}
                            onChangeText={setTransitionNotes}
                          />

                          <View style={styles.actionBtnGrid}>
                            <Pressable 
                              style={[styles.actionBtn, { backgroundColor: '#ff9800' }]}
                              onPress={() => handleUpdateState('Coletado')}
                              disabled={loading}
                            >
                              <SymbolView name={{ ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' }} size={16} tintColor="#ffffff" />
                              <ThemedText type="code" style={styles.actionBtnText}>Marcar Coletado</ThemedText>
                            </Pressable>
                            
                            <Pressable 
                              style={[styles.actionBtn, { backgroundColor: '#4caf50' }]}
                              onPress={() => handleUpdateState('Confirmado')}
                              disabled={loading}
                            >
                              <SymbolView name="checkmark.seal" size={16} tintColor="#ffffff" />
                              <ThemedText type="code" style={styles.actionBtnText}>Confirmar Recebido</ThemedText>
                            </Pressable>

                            <Pressable 
                              style={[styles.actionBtn, { backgroundColor: '#f44336' }]}
                              onPress={() => handleUpdateState('Cancelado')}
                              disabled={loading}
                            >
                              <SymbolView name="xmark.octagon" size={16} tintColor="#ffffff" />
                              <ThemedText type="code" style={styles.actionBtnText}>Cancelar Doação</ThemedText>
                            </Pressable>
                          </View>
                          
                          {loading && (
                            <ActivityIndicator style={{ marginTop: Spacing.two }} size="small" color="#3c87f7" />
                          )}
                        </ThemedView>
                      )}
                    </Pressable>
                  );
                })}
            </View>
          )}
        </ThemedView>

        {/* NOTIFICATIONS INBOX */}
        <ThemedView type="backgroundElement" style={styles.notificationsContainer}>
          <View style={styles.notifHeader}>
            <SymbolView name="bell.fill" size={18} tintColor="#e91e63" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Mensagens e Alertas de Perecibilidade ({ngoNotifications.filter(n => !n.read).length})</ThemedText>
          </View>
          
          {ngoNotifications.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.three }}>
              Sem notificações recentes.
            </ThemedText>
          ) : (
            <View style={styles.notifList}>
              {ngoNotifications.map(notif => (
                <Pressable 
                  key={notif.id} 
                  onPress={() => store.markNotificationRead(notif.id)}
                  style={[styles.notifCard, !notif.read && styles.notifUnread, { borderBottomColor: theme.backgroundSelected }]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={!notif.read ? { color: '#e91e63' } : undefined}>{notif.title}</ThemedText>
                    <ThemedText type="small" style={{ fontSize: 13, marginTop: 2 }}>{notif.message}</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 9, opacity: 0.5, marginTop: 4 }}>
                      {new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                  {!notif.read && (
                    <View style={styles.unreadDot} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ThemedView>

      </SafeAreaView>
    </ScrollView>
  );
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
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  loginHintBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.06)',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  kpiLabel: {
    fontSize: 9,
    opacity: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  chartContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  chartBody: {
    flexDirection: 'row',
    height: 180,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  chartYAxis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 35,
    paddingRight: Spacing.two,
    borderRightWidth: 1,
    borderRightColor: 'rgba(150,150,150,0.2)',
  },
  yAxisLabel: {
    fontSize: 9,
    opacity: 0.6,
  },
  chartBarsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingLeft: Spacing.two,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 60,
  },
  barOuter: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  barInner: {
    width: '100%',
    borderRadius: 3,
  },
  barActual: {
    backgroundColor: '#3c87f7',
  },
  barPrediction: {
    backgroundColor: '#9c27b0',
  },
  barValueLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    position: 'absolute',
    top: -15,
  },
  barLabel: {
    fontSize: 8,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
    paddingTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  listContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listDesc: {
    fontSize: 12,
    marginBottom: Spacing.three,
  },
  emptyListText: {
    textAlign: 'center',
    padding: Spacing.four,
  },
  matchedList: {
    gap: Spacing.two,
  },
  matchCard: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    padding: Spacing.three,
  },
  matchCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityScoreBadge: {
    backgroundColor: '#ff9800',
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  matchDesc: {
    fontSize: 12,
    opacity: 0.8,
  },
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
  },
  metaText: {
    fontSize: 9,
    opacity: 0.6,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(150,150,150,0.5)',
  },
  stateTransitionArea: {
    marginTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.15)',
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  sectionSubTitle: {
    fontSize: 12,
    color: '#3c87f7',
  },
  timelineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    overflow: 'scroll',
    marginVertical: Spacing.two,
  },
  timelineNodeCol: {
    alignItems: 'center',
    flex: 1,
    minWidth: 50,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(150,150,150,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#4caf50',
  },
  timelineDotActive: {
    backgroundColor: '#2196f3',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineNodeLabel: {
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
  timelineTimeLabel: {
    fontSize: 7,
    opacity: 0.5,
    marginTop: 2,
  },
  timelineLinkLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginHorizontal: -5,
  },
  timelineLinkLineDone: {
    backgroundColor: '#4caf50',
  },
  errorTimelineBanner: {
    backgroundColor: '#f44336',
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginTop: Spacing.one,
  },
  successTimelineBanner: {
    backgroundColor: '#4caf50',
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginTop: Spacing.one,
  },
  controlLabel: {
    fontSize: 12,
    marginTop: Spacing.two,
  },
  transitionInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  actionBtnGrid: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  notificationsContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  notifList: {
    gap: Spacing.one,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  notifUnread: {
    backgroundColor: '#e91e630b',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e91e63',
    marginLeft: Spacing.two,
  },
});
