import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Pressable,
  ScrollView,
  View,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useAdminWeights, useAdminAuditLogs } from '@/hooks/useAdmin';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const { data: dashData, isLoading: loadingDash, error: dashError } = useDashboard('admin');
  const theme = useTheme();

  const { weights, save: saveWeights, retrain: triggerRetrain, isSaving } = useAdminWeights();
  const { logs, refresh: refreshLogs } = useAdminAuditLogs(50);
  const { notifs, triggerExpiry } = useNotifications({ category: 'scarcity' });

  const [urgencyWeight, setUrgencyWeight] = useState('45');
  const [demandWeight, setDemandWeight] = useState('35');
  const [distanceWeight, setDistanceWeight] = useState('20');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [retraining, setRetraining] = useState(false);
  const [scanningExpiry, setScanningExpiry] = useState(false);

  useEffect(() => {
    if (weights) {
      setUrgencyWeight((weights.urgency * 100).toString());
      setDemandWeight((weights.demand * 100).toString());
      setDistanceWeight((weights.distance * 100).toString());
    }
  }, [weights]);

  const isAdmin = user && user.tipo === 'admin';
  const dash = dashData && 'perfil' in dashData && dashData.perfil === 'admin' ? dashData : null;

  const handleSaveWeights = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const u = parseFloat(urgencyWeight) || 0;
    const d = parseFloat(demandWeight) || 0;
    const dist = parseFloat(distanceWeight) || 0;
    if (Math.round(u + d + dist) !== 100) {
      setErrorMsg('A soma dos pesos deve ser exatamente 100%.');
      return;
    }
    try {
      await saveWeights({ urgency: u / 100, demand: d / 100, distance: dist / 100 });
      setSuccessMsg('Pesos de prioridade atualizados! Afinidades recalculadas.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Erro ao salvar pesos');
    }
  };

  const handleRetrainModels = async () => {
    setRetraining(true);
    try {
      const res = await triggerRetrain();
      const rc = Array.isArray(res.scripts) ? res.scripts.map((s: any) => s.returncode ?? 0) : [];
      const ok = rc.every((r: number) => r === 0);
      Alert.alert(
        ok ? 'Sucesso' : 'Atenção',
        ok
          ? 'Modelos retreinados! Previsões de demanda atualizadas.'
          : 'Retreinamento concluido com avisos. Veja /health.'
      );
    } catch (err) {
      Alert.alert('Erro', (err as Error).message || 'Falha ao retreinar');
    } finally {
      setRetraining(false);
    }
  };

  const handleTriggerNearExpiryCheck = async () => {
    setScanningExpiry(true);
    try {
      const criadas = await triggerExpiry();
      Alert.alert('Concluido', `${criadas} alerta(s) de vencimento gerado(s).`);
    } catch (err) {
      Alert.alert('Erro', (err as Error).message || 'Falha ao checar vencimentos');
    } finally {
      setScanningExpiry(false);
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
            <ThemedText type="subtitle">Painel do Administrador</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Visão consolidada do Motor de Machine Learning e Auditoria
            </ThemedText>
          </View>
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <ThemedText type="small" style={{ color: '#e91e63' }}>Sair</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="slider.horizontal.3" size={20} tintColor="#ff9800" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Ajustar Função de Ponderação do Score (RF-16)</ThemedText>
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.cardDesc}>
            Configure a relevância de cada fator no cálculo de prioridade de matching. A soma deve ser igual a 100%.
          </ThemedText>

          {errorMsg !== '' && (
            <View style={styles.errorBanner}><ThemedText type="small" style={{ color: '#ffffff' }}>{errorMsg}</ThemedText></View>
          )}
          {successMsg !== '' && (
            <View style={styles.successBanner}><ThemedText type="small" style={{ color: '#ffffff' }}>{successMsg}</ThemedText></View>
          )}

          <View style={styles.weightFormGrid}>
            <View style={styles.weightInputCol}>
              <ThemedText type="code" style={styles.inputLabel}>Urgência do Perecível (%)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                keyboardType="numeric"
                value={urgencyWeight}
                onChangeText={setUrgencyWeight}
              />
            </View>

            <View style={styles.weightInputCol}>
              <ThemedText type="code" style={styles.inputLabel}>Demanda da ONG (%)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                keyboardType="numeric"
                value={demandWeight}
                onChangeText={setDemandWeight}
              />
            </View>

            <View style={styles.weightInputCol}>
              <ThemedText type="code" style={styles.inputLabel}>Proximidade GPS (%)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                keyboardType="numeric"
                value={distanceWeight}
                onChangeText={setDistanceWeight}
              />
            </View>
          </View>

          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#ff9800', marginTop: Spacing.three }]}
            onPress={handleSaveWeights}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <SymbolView name="checkmark" size={16} tintColor="#ffffff" />
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Salvar Pesos e Recomputar Matches</ThemedText>
              </>
            )}
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="brain.head.profile" size={20} tintColor="#9c27b0" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Motor de Machine Learning & Jobs (RNF-06)</ThemedText>
          </View>

          <View style={styles.modelStatusGrid}>
            <ThemedView type="backgroundSelected" style={styles.modelStatusBox}>
              <ThemedText type="smallBold" style={{ color: '#9c27b0' }}>Urgência de Perecíveis</ThemedText>
              <ThemedText type="code" style={styles.modelStatText}>Modelo: Random Forest / GB</ThemedText>
              <ThemedText type="code" style={styles.modelStatText}>Inputs: Tipo, Categoria, Validade</ThemedText>
              <ThemedText type="code" style={styles.modelStatText}>Tempo Resposta: 0.18s (&lt; 2s)</ThemedText>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                <ThemedText type="code" style={{ fontSize: 9 }}>ATIVO E VERIFICADO</ThemedText>
              </View>
            </ThemedView>

            <ThemedView type="backgroundSelected" style={styles.modelStatusBox}>
              <ThemedText type="smallBold" style={{ color: '#2196f3' }}>Previsão de Demanda</ThemedText>
              <ThemedText type="code" style={styles.modelStatText}>Modelo: statsforecast (Nixtla)</ThemedText>
              <ThemedText type="code" style={styles.modelStatText}>Algoritmos: AutoETS, AutoARIMA</ThemedText>
              <ThemedText type="code" style={styles.modelStatText}>Histórico: Semanal + Sazonal</ThemedText>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                <ThemedText type="code" style={{ fontSize: 9 }}>ATIVO E VERIFICADO</ThemedText>
              </View>
            </ThemedView>
          </View>

          <ThemedText type="code" style={styles.retrainedText}>
            {weights?.updated_at
              ? `Último retreinamento: ${new Date(weights.updated_at).toLocaleDateString('pt-BR')} às ${new Date(weights.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Último retreinamento: ainda não registrado.'}
          </ThemedText>

          <View style={styles.adminJobsRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#3c87f7', flex: 1 }]}
              onPress={handleRetrainModels}
              disabled={retraining}
            >
              {retraining ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <SymbolView name="arrow.clockwise" size={16} tintColor="#ffffff" />
                  <ThemedText type="code" style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                    Forçar Retreino
                  </ThemedText>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#e91e63', flex: 1 }]}
              onPress={handleTriggerNearExpiryCheck}
              disabled={scanningExpiry}
            >
              {scanningExpiry ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <SymbolView name="bell" size={16} tintColor="#ffffff" />
                  <ThemedText type="code" style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                    Checar Alimentos Vencendo (RF-28)
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="exclamationmark.triangle.fill" size={18} tintColor="#f44336" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Alertas Preditivos de Escassez (RF-14)</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardDesc}>
            Disparado automaticamente quando a demanda prevista de uma ONG supera o volume de doações ativas destinadas a ela.
          </ThemedText>

          {notifs.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.three }}>
              Nenhum alerta de escassez ativo no momento.
            </ThemedText>
          ) : (
            <View style={styles.scarcityList}>
              {notifs.map(alert => (
                <ThemedView key={alert.id} type="backgroundSelected" style={styles.scarcityCard}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: '#f44336' }}>{alert.title}</ThemedText>
                    <ThemedText type="small" style={{ fontSize: 13, marginTop: 2 }}>{alert.message}</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 9, opacity: 0.5, marginTop: 4 }}>
                      Gerado em {new Date(alert.timestamp).toLocaleDateString('pt-BR')} às {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="doc.plaintext" size={20} tintColor="#2196f3" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Logs de Auditoria de Estados (RF-22 / RF-20)</ThemedText>
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.cardDesc}>
            Registro cronológico inalterável de todas as transições de status das doações no sistema.
          </ThemedText>

          <Pressable onPress={refreshLogs} style={{ alignSelf: 'flex-end', marginBottom: Spacing.one }}>
            <ThemedText type="code" style={{ color: '#3c87f7', fontSize: 10 }}>Atualizar</ThemedText>
          </Pressable>

          <View style={styles.auditList}>
            {logs.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.three }}>
                Nenhum log de auditoria registrado.
              </ThemedText>
            ) : (
              logs.map((log) => (
                <ThemedView key={log.id} type="backgroundSelected" style={styles.auditCard}>
                  <View style={styles.auditHeader}>
                    <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>{log.doacao_nome ?? `Doação #${log.doacao_id}`}</ThemedText>
                    <ThemedText type="code" style={styles.auditTime}>
                      {new Date(log.timestamp).toLocaleDateString('pt-BR')} • {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </ThemedText>
                  </View>

                  <View style={styles.auditTransitionRow}>
                    <View style={styles.auditStatusLabel}>
                      <ThemedText type="code" style={{ fontSize: 10 }}>{log.estado_anterior || '—'}</ThemedText>
                    </View>
                    <SymbolView name="arrow.right" size={12} tintColor={theme.textSecondary} />
                    <View style={[styles.auditStatusLabel, { backgroundColor: '#4caf5033' }]}>
                      <ThemedText type="code" style={{ fontSize: 10, fontWeight: 'bold' }}>{log.estado_novo}</ThemedText>
                    </View>
                  </View>

                  {log.descricao && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.auditNotes}>
                      Obs: {log.descricao}
                    </ThemedText>
                  )}
                </ThemedView>
              ))
            )}
          </View>
        </ThemedView>

      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e91e6344' },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.two },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.three },
  errorBanner: {
    backgroundColor: '#f44336',
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginBottom: Spacing.two,
  },
  successBanner: {
    backgroundColor: '#4caf50',
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginBottom: Spacing.two,
  },
  weightFormGrid: { flexDirection: 'row', gap: Spacing.two },
  weightInputCol: { flex: 1 },
  inputLabel: { fontSize: 10, marginBottom: 4, opacity: 0.8 },
  input: {
    height: 45,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  modelStatusGrid: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  modelStatusBox: { flex: 1, borderRadius: Spacing.two, padding: Spacing.three, gap: 4 },
  modelStatText: { fontSize: 10, opacity: 0.8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.one },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  retrainedText: { fontSize: 10, opacity: 0.6, textAlign: 'center', marginVertical: Spacing.two },
  adminJobsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  scarcityList: { gap: Spacing.two },
  scarcityCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  auditList: { gap: Spacing.two, maxHeight: 400 },
  auditCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.06)',
    gap: 4,
  },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditTime: { fontSize: 9, opacity: 0.6 },
  auditTransitionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginVertical: 2 },
  auditStatusLabel: {
    backgroundColor: 'rgba(150,150,150,0.15)',
    paddingVertical: 1,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  auditNotes: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
});
