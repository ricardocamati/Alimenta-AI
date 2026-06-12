import React, { useState } from 'react';
import { 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  View, 
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { formatDateInput, parseBRDate, toDisplayDate } from '@/utils/dateMask';
import { useDashboard } from '@/hooks/useDashboard';
import { useDoacoesOng } from '@/hooks/useDoacoesOng';
import { useHistorico } from '@/hooks/useHistorico';
import { useNgoPreferences } from '@/hooks/useNgoPreferences';
import { getImageUrl } from '@/lib/imageUrl';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LineChart } from '@/components/LineChart';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import type { DoacaoDTO } from '@/types';

const FOOD_PHOTOS: Record<string, { name: string; emoji: string; color: string }> = {
  tomatoes: { name: 'Tomates', emoji: '🍅', color: '#ff5252' },
  bread: { name: 'Pão Caseiro', emoji: '🍞', color: '#ffa726' },
  oranges: { name: 'Laranjas', emoji: '🍊', color: '#ffb74d' },
  milk: { name: 'Leite Longa Vida', emoji: '🥛', color: '#e0e0e0' },
  vegetables: { name: 'Cesta de Verduras', emoji: '🥬', color: '#81c784' },
  meats: { name: 'Carne Bovina', emoji: '🥩', color: '#e57373' },
  banana: { name: 'Banana', emoji: '🍌', color: '#ffe135' },
  rice: { name: 'Arroz', emoji: '🍚', color: '#e0e0e0' },
  pasta: { name: 'Macarrão', emoji: '🍝', color: '#ffab91' },
  generic: { name: 'Alimento', emoji: '🍽️', color: '#9e9e9e' },
};

function getDonationPhoto(tipoAlimento: string) {
  const lower = tipoAlimento.toLowerCase();
  if (lower.includes('tomate')) return FOOD_PHOTOS.tomatoes;
  if (lower.includes('pão')) return FOOD_PHOTOS.bread;
  if (lower.includes('laranja')) return FOOD_PHOTOS.oranges;
  if (lower.includes('leite')) return FOOD_PHOTOS.milk;
  if (lower.includes('verdura') || lower.includes('legume')) return FOOD_PHOTOS.vegetables;
  if (lower.includes('carne') || lower.includes('bovina')) return FOOD_PHOTOS.meats;
  if (lower.includes('banana')) return FOOD_PHOTOS.banana;
  if (lower.includes('arroz') || lower.includes('grão')) return FOOD_PHOTOS.rice;
  if (lower.includes('macarrão') || lower.includes('pasta')) return FOOD_PHOTOS.pasta;
  return FOOD_PHOTOS.generic;
}

const STATUS_LABELS: Record<string, string> = {
  cadastrado: 'Cadastrado',
  analisado: 'Analisado',
  matched: 'Matched',
  notificado: 'Notificado',
  coletado: 'Coletado',
  confirmado: 'Confirmado',
};

const STATUS_COLORS: Record<string, string> = {
  cadastrado: '#2196f3',
  analisado: '#9c27b0',
  matched: '#ff9800',
  notificado: '#e91e63',
  coletado: '#4caf50',
  confirmado: '#2e7d32',
};

export default function NgoScreen() {
  const { user, logout } = useAuth();
  const { data: dashData, isLoading: loadingDash, error: dashError, refresh: refreshDash } = useDashboard('ong');
  const { doacoes, isLoading, error, refresh, atualizarStatus } = useDoacoesOng();
  const { historico, isLoading: isLoadingHist, error: errorHist, refresh: refreshHist, registrar } = useHistorico();
  const { ong, update: updateOngPrefs } = useNgoPreferences();
  const theme = useTheme();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [msg, setMsg] = useState('');
  const [semanaInput, setSemanaInput] = useState('');
  const [qtdInput, setQtdInput] = useState('');
  const [loadingHist, setLoadingHist] = useState(false);
  const [msgHist, setMsgHist] = useState('');
  const [capInput, setCapInput] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [msgPrefs, setMsgPrefs] = useState('');

  const dash = dashData && 'perfil' in dashData && dashData.perfil === 'ong' ? dashData : null;

  React.useEffect(() => {
    if (ong) {
      setCapInput(String(ong.capacidade_atendimento));
      setScheduleInput(ong.pickup_schedule || '');
    }
  }, [ong?.capacidade_atendimento, ong?.pickup_schedule]);

  const handleSavePrefs = async () => {
    if (!ong) return;
    setSavingPrefs(true);
    setMsgPrefs('');
    try {
      await updateOngPrefs({
        capacidade_atendimento: parseInt(capInput, 10) || ong.capacidade_atendimento,
        pickup_schedule: scheduleInput,
      });
      setMsgPrefs('Preferências atualizadas!');
      setTimeout(() => setMsgPrefs(''), 2500);
    } catch (err) {
      setMsgPrefs('Erro ao salvar');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleAction = async (doacao: DoacaoDTO, novoStatus: string) => {
    setLoadingAction(true);
    setMsg('');
    const result = await atualizarStatus(doacao.id, novoStatus, notes || undefined);
    setLoadingAction(false);
    if (result) {
      setMsg(`Status atualizado para "${STATUS_LABELS[novoStatus]}" com sucesso!`);
      setNotes('');
      refreshDash(); // Atualiza cards de resumo (Total Coletados, Em Analise, etc.)
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <SafeAreaView style={styles.safeArea}>
        
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="subtitle">Portal da ONG</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user?.nome || 'ONG'}
            </ThemedText>
          </View>
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <ThemedText type="small" style={{ color: '#e91e63' }}>Sair</ThemedText>
          </Pressable>
        </ThemedView>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="subtitle">{dash?.total_doacoes_recebidas ?? 0}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Recebidas</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="subtitle">{dash?.doacoes_pendentes ?? 0}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Pendentes</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="subtitle">{dash?.demanda_prevista_proxima_semana?.toFixed(0) ?? 0}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Demanda (kg)</ThemedText>
          </View>
        </View>

        {/* ALERT - so aparece quando ha escassez ativa (pendencia > 0) */}
        {dash?.alerta_escassez && (dash?.doacoes_pendentes ?? 0) > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#e91e6322' }]}>
            <SymbolView name="exclamationmark.triangle" size={16} tintColor="#e91e63" />
            <ThemedText type="small" style={{ color: '#e91e63', marginLeft: 8 }}>
              Alerta de escassez detectado! Demanda prevista acima da capacidade.
            </ThemedText>
          </View>
        )}

                {/* CHART: Demanda vs Histórico (LINHA) */}
        {dash?.historico_semanal && dash.historico_semanal.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <SymbolView name="chart.line.uptrend.xyaxis" size={18} tintColor="#2196f3" />
              <ThemedText type="smallBold" style={{ marginLeft: 8 }}>
                Demanda Prevista vs Histórico
              </ThemedText>
            </View>
            <LineChart
              data={dash.historico_semanal}
              demandaPrevista={dash.demanda_prevista_proxima_semana || 0}
              theme={theme}
            />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#3c87f7' }]} />
                <ThemedText type="code" style={{ fontSize: 10 }}>Atendimento Real (kg)</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#e91e63', borderRadius: 6 }]} />
                <ThemedText type="code" style={{ fontSize: 10 }}>Demanda Prevista (kg)</ThemedText>
              </View>
            </View>
          </ThemedView>
        )}

        {/* PREFERENCIAS DA ONG */}
        {ong && (
          <ThemedView type="backgroundElement" style={styles.historicoContainer}>
            <View style={styles.listHeader}>
              <ThemedText type="smallBold">Preferências de Captação</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.listDesc}>
              Configure quanto sua ONG consegue atender por semana e o melhor horário para receber coletas.
            </ThemedText>

            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, { flex: 1, color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Capacidade (kg/semana)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={capInput}
                onChangeText={setCapInput}
              />
              <TextInput
                style={[styles.formInput, { flex: 1, color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Horário de coleta"
                placeholderTextColor={theme.textSecondary}
                value={scheduleInput}
                onChangeText={setScheduleInput}
              />
              <Pressable
                style={[styles.btn, { backgroundColor: '#ff9800', flex: 0.6 }]}
                onPress={handleSavePrefs}
                disabled={savingPrefs}
              >
                <ThemedText type="code" style={styles.btnText}>Salvar</ThemedText>
              </Pressable>
            </View>

            {msgPrefs !== '' && (
              <View style={styles.msgBanner}>
                <ThemedText type="small" style={{ color: '#4caf50' }}>{msgPrefs}</ThemedText>
              </View>
            )}

            {ong.accepted_food_types && ong.accepted_food_types.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
                Aceita: {ong.accepted_food_types.join(', ')}
                {ong.pickup_radius ? ` • Raio: ${ong.pickup_radius} km` : ''}
              </ThemedText>
            )}
          </ThemedView>
        )}

        {/* HISTÓRICO: Registrar Atendimento */}
        <ThemedView type="backgroundElement" style={styles.historicoContainer}>
          <View style={styles.listHeader}>
            <ThemedText type="smallBold">Atendimento Semanal</ThemedText>
            <Pressable onPress={refreshHist} style={styles.refreshBtn}>
              <SymbolView name="arrow.clockwise" size={14} tintColor={theme.textSecondary} />
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.listDesc}>
            Registre quantas pessoas (ou kg) sua ONG atendeu por semana. Isso melhora as previsões de demanda.
          </ThemedText>

          <View style={styles.formRow}>
            <TextInput
              style={[styles.formInput, { flex: 1, color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
              placeholder="DD/MM/AAAA (segunda)"
              placeholderTextColor={theme.textSecondary}
              value={semanaInput}
              onChangeText={(t) => setSemanaInput(formatDateInput(t))}
              maxLength={10}
            />
            <TextInput
              style={[styles.formInput, { flex: 1, color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
              placeholder="Qtd atendida (kg)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={qtdInput}
              onChangeText={setQtdInput}
            />
            <Pressable
              style={[styles.btn, { backgroundColor: '#2196f3', flex: 0.6 }]}
              onPress={async () => {
                if (!semanaInput || !qtdInput) return;
                setLoadingHist(true);
                setMsgHist('');
                const isoSemana = parseBRDate(semanaInput);
                if (!isoSemana) {
                  setMsgHist('Data inválida. Use DD/MM/AAAA.');
                  setLoadingHist(false);
                  return;
                }
                const result = await registrar({
                  semana: isoSemana,
                  quantidade_atendida: parseInt(qtdInput, 10),
                });
                setLoadingHist(false);
                if (result) {
                  setMsgHist('Registrado com sucesso!');
                  setSemanaInput('');
                  setQtdInput('');
                  setTimeout(() => setMsgHist(''), 3000);
                }
              }}
              disabled={loadingHist}
            >
              <ThemedText type="code" style={styles.btnText}>Salvar</ThemedText>
            </Pressable>
          </View>

          {msgHist !== '' && (
            <View style={styles.msgBanner}>
              <ThemedText type="small" style={{ color: '#4caf50' }}>{msgHist}</ThemedText>
            </View>
          )}

          {(loadingHist || isLoadingHist) && (
            <ActivityIndicator style={{ margin: 12 }} color="#3c87f7" />
          )}

          {errorHist && <ErrorMessage message={errorHist} />}

          {!isLoadingHist && historico.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhum registro de atendimento ainda.
            </ThemedText>
          )}

          {historico.map((h) => (
            <View key={h.id} style={[styles.historicoRow, { borderColor: theme.backgroundSelected }]}>
              <SymbolView name="calendar" size={14} tintColor={theme.textSecondary} />
              <ThemedText type="code" style={{ marginLeft: 8, flex: 1 }}>
                Semana {h.semana}
              </ThemedText>
              <ThemedText type="code" style={{ fontWeight: '700' }}>
                {h.quantidade_atendida} kg
              </ThemedText>
            </View>
          ))}
        </ThemedView>

        {/* MATCHING LIST */}
        <ThemedView type="backgroundElement" style={styles.listContainer}>
          <View style={styles.listHeader}>
            <ThemedText type="smallBold">Doações Direcionadas (Matching Inteligente)</ThemedText>
            <Pressable onPress={refresh} style={styles.refreshBtn}>
              <SymbolView name="arrow.clockwise" size={14} tintColor={theme.textSecondary} />
            </Pressable>
          </View>
          
          <ThemedText type="small" themeColor="textSecondary" style={styles.listDesc}>
            Lista ordenada automaticamente por prioridade (Distância + Perecibilidade + Escassez).
          </ThemedText>

          {(isLoading || loadingDash) && (
            <ActivityIndicator style={{ margin: 24 }} color="#3c87f7" />
          )}

          {(error || dashError) && (
            <ErrorMessage message={error || dashError || 'Erro ao carregar'} />
          )}

          {!isLoading && !error && doacoes.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhuma doação compatível no momento.
            </ThemedText>
          )}

          {!isLoading && doacoes.map(doacao => {
            const photo = getDonationPhoto(doacao.tipo_alimento);
            const isSelected = selectedId === doacao.id;
            
  return (
              <Pressable 
                key={doacao.id}
                onPress={() => {
                  setSelectedId(isSelected ? null : doacao.id);
                  setMsg('');
                }}
                style={[
                  styles.matchCard, 
                  isSelected && { borderColor: '#ff9800', borderWidth: 2 },
                  { backgroundColor: theme.backgroundSelected }
                ]}
              >
                <View style={styles.matchCardRow}>
                  <View style={[styles.emojiCircle, { backgroundColor: photo.color + '22' }]}>
                    {getImageUrl(doacao.foto_url) ? (
                      <Image source={{ uri: getImageUrl(doacao.foto_url)! }} style={{ width: 50, height: 50, borderRadius: 25 }} resizeMode="cover" />
                    ) : (
                      <ThemedText style={{ fontSize: 28 }}>{photo.emoji}</ThemedText>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.matchHeader}>
                      <ThemedText type="smallBold">{doacao.tipo_alimento}</ThemedText>
                      <View style={styles.scoreBadge}>
                        <ThemedText type="code" style={styles.scoreText}>
                          Score {Math.round(doacao.score_matching ?? 0)}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <ThemedText type="code" style={styles.metaText}>
                      Qtd: {doacao.quantidade} kg • Doador: {doacao.doador_nome || '---'}
                    </ThemedText>

                    <View style={styles.metaRow}>
                      <SymbolView name="location" size={11} tintColor={theme.textSecondary} />
                      <ThemedText type="code" style={styles.metaDetail}>
                        Distância: {doacao.distancia_km ? `${doacao.distancia_km.toFixed(1)} km` : 'Calculando...'}
                      </ThemedText>
                      <View style={styles.metaDot} />
                      <SymbolView name="calendar" size={11} tintColor={theme.textSecondary} />
                      <ThemedText type="code" style={styles.metaDetail}>
                        Vence em: {toDisplayDate(doacao.data_validade)}
                      </ThemedText>
                    </View>

                    {/* Status */}
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[doacao.status] || '#757575' }]} />
                      <ThemedText type="code" style={[styles.statusText, { color: STATUS_COLORS[doacao.status] || '#757575' }]}>
                        {STATUS_LABELS[doacao.status] || doacao.status}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Ação expandida */}
                {isSelected && (
                  <View style={styles.actionArea}>
                    <ThemedText type="smallBold">Atualizar Fluxo da Coleta</ThemedText>

                    {/* Dados do doador para coleta (Q1.a: so no expandido) */}
                    <View style={styles.doadorInfoBox}>
                      <ThemedText type="code" style={styles.doadorInfoLabel}>Dados do Doador</ThemedText>
                      <View style={styles.doadorInfoRow}>
                        <SymbolView name="location.fill" size={12} tintColor={theme.textSecondary} />
                        <ThemedText type="code" style={styles.doadorInfoText}>
                          {doacao.doador_endereco || 'Endereco nao cadastrado pelo doador'}
                        </ThemedText>
                      </View>
                      <View style={styles.doadorInfoRow}>
                        <SymbolView name="phone.fill" size={12} tintColor={theme.textSecondary} />
                        <ThemedText type="code" style={styles.doadorInfoText}>
                          {doacao.doador_telefone || 'Telefone nao cadastrado pelo doador'}
                        </ThemedText>
                      </View>
                    </View>

                    <TextInput 
                      style={[styles.noteInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                      placeholder="Observações (ex: Coletado pelo motorista Pedro)"
                      placeholderTextColor={theme.textSecondary}
                      value={notes}
                      onChangeText={setNotes}
                    />

                    {msg !== '' && (
                      <View style={styles.msgBanner}>
                        <ThemedText type="small" style={{ color: '#4caf50' }}>{msg}</ThemedText>
                      </View>
                    )}

                    <View style={styles.btnRow}>
                      {doacao.status === 'matched' && (
                        <Pressable 
                          style={[styles.btn, { backgroundColor: '#2196f3' }]}
                          onPress={() => handleAction(doacao, 'notificado')}
                          disabled={loadingAction}
                        >
                          <ThemedText type="code" style={styles.btnText}>Reservar Doação</ThemedText>
                        </Pressable>
                      )}
                      
                      {doacao.status === 'notificado' && (
                        <Pressable 
                          style={[styles.btn, { backgroundColor: '#ff9800' }]}
                          onPress={() => handleAction(doacao, 'coletado')}
                          disabled={loadingAction}
                        >
                          <ThemedText type="code" style={styles.btnText}>Marcar Coletado</ThemedText>
                        </Pressable>
                      )}
                      
                      {/* Q5.b: 'Confirmar Recebido' removido - fluxo agora e Reservar -> Coletado */}
                    </View>

                    {loadingAction && <ActivityIndicator style={{ marginTop: 12 }} color="#3c87f7" />}
                  </View>
                )}
              </Pressable>
            );
          })}
        </ThemedView>

      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset + Spacing.four },
  safeArea: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  header: { marginTop: Spacing.four, marginBottom: Spacing.three, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e91e6344' },
  statsRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three },
  statCard: { flex: 1, borderRadius: 12, padding: Spacing.three, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: 10, marginBottom: Spacing.three, borderWidth: 1, borderColor: '#e91e6344' },
  listContainer: { marginTop: Spacing.three, borderRadius: 16, padding: Spacing.three, borderWidth: 1, borderColor: '#333' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  refreshBtn: { padding: 4 },
  listDesc: { marginBottom: Spacing.three, fontSize: 12 },
  emptyText: { textAlign: 'center', padding: Spacing.three },
  matchCard: { borderRadius: 16, padding: Spacing.three, marginBottom: Spacing.three, borderWidth: 1, borderColor: '#333' },
  matchCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  emojiCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreBadge: { backgroundColor: '#ff980022', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { color: '#ff9800', fontSize: 11 },
  metaText: { fontSize: 12, opacity: 0.7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaDetail: { fontSize: 11, opacity: 0.6 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#666', marginHorizontal: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10 },
  actionArea: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: '#333' },
  doadorInfoBox: { marginTop: Spacing.two, padding: Spacing.two, borderRadius: 8, backgroundColor: '#ffffff08', gap: 4 },
  doadorInfoLabel: { fontSize: 11, fontWeight: '700', opacity: 0.7, marginBottom: 2 },
  doadorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doadorInfoText: { fontSize: 11, opacity: 0.85, flex: 1 },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: Spacing.two, fontSize: 13 },
  msgBanner: { marginTop: Spacing.two },
  btnRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // Estilos do gráfico
  chartContainer: { marginTop: Spacing.three, borderRadius: 16, padding: Spacing.three, borderWidth: 1, borderColor: '#333' },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.two },
  chartBody: { flexDirection: 'row', height: 140, marginBottom: Spacing.two },
  chartYAxis: { width: 40, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 },
  yAxisLabel: { fontSize: 10, opacity: 0.5 },
  chartBarsArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  chartBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barOuter: { width: 50, height: '85%', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  barInner: { width: '70%', borderRadius: 4 },
  barActual: { backgroundColor: '#3c87f7' },
  barPrediction: { backgroundColor: '#9c27b0' },
  barValueLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  barLabel: { fontSize: 10, opacity: 0.6, marginTop: 4 },
  chartLegend: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'center', marginTop: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 12, height: 12, borderRadius: 3 },

  // Estilos do histórico
  historicoContainer: { marginTop: Spacing.three, borderRadius: 16, padding: Spacing.three, borderWidth: 1, borderColor: '#333' },
  formRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13 },
  historicoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two, borderBottomWidth: 1, borderColor: '#333' },
});
