import React, { useState } from 'react';
import { 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  View, 
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useDoacoesOng } from '@/hooks/useDoacoesOng';
import { ErrorMessage } from '@/components/ErrorMessage';
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
  const { user } = useAuth();
  const { data: dashData, isLoading: loadingDash, error: dashError } = useDashboard();
  const { doacoes, isLoading, error, refresh, atualizarStatus } = useDoacoesOng();
  const theme = useTheme();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [msg, setMsg] = useState('');

  const dash = dashData && 'perfil' in dashData && dashData.perfil === 'ong' ? dashData : null;

  const handleAction = async (doacao: DoacaoDTO, novoStatus: string) => {
    setLoadingAction(true);
    setMsg('');
    const result = await atualizarStatus(doacao.id, novoStatus, notes || undefined);
    setLoadingAction(false);
    if (result) {
      setMsg(`Status atualizado para "${STATUS_LABELS[novoStatus]}" com sucesso!`);
      setNotes('');
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
            <ThemedText type="small" themeColor="textSecondary">Demanda (Semana)</ThemedText>
          </View>
        </View>

        {/* ALERT */}
        {dash?.alerta_escassez && (
          <View style={[styles.alertBanner, { backgroundColor: '#e91e6322' }]}>
            <SymbolView name="exclamationmark.triangle" size={16} tintColor="#e91e63" />
            <ThemedText type="small" style={{ color: '#e91e63', marginLeft: 8 }}>
              Alerta de escassez detectado! Demanda prevista acima da capacidade.
            </ThemedText>
          </View>
        )}

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
                    <ThemedText style={{ fontSize: 28 }}>{photo.emoji}</ThemedText>
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
                        Vence em: {doacao.data_validade}
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
                      
                      {doacao.status === 'coletado' && (
                        <Pressable 
                          style={[styles.btn, { backgroundColor: '#4caf50' }]}
                          onPress={() => handleAction(doacao, 'confirmado')}
                          disabled={loadingAction}
                        >
                          <ThemedText type="code" style={styles.btnText}>Confirmar Recebido</ThemedText>
                        </Pressable>
                      )}
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
  header: { marginTop: Spacing.four, marginBottom: Spacing.three },
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
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: Spacing.two, fontSize: 13 },
  msgBanner: { marginTop: Spacing.two },
  btnRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
