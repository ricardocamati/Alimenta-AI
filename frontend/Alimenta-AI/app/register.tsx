import { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import * as Location from 'expo-location';

async function geocodeAddress(endereco: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (Platform.OS === 'web') {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await res.json();
      if (!data || data.length === 0) return null;
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    const results = await Location.geocodeAsync(endereco);
    if (!results || results.length === 0) return null;
    return { latitude: results[0].latitude, longitude: results[0].longitude };
  } catch {
    return null;
  }
}

export default function RegisterScreen() {
  const { user, register } = useAuth();
  const theme = useTheme();

  const [mode, setMode] = useState<'donor' | 'ngo'>('donor');

  // Input states
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in (guard against double redirect)
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      if (user.tipo === 'doador') router.replace('/donor');
      else if (user.tipo === 'ong') router.replace('/ngo');
      else router.replace('/admin');
    }
  }, [user]);

  const clearFieldErrors = () => { setFieldErrors({}); };

  const handleRegisterDonor = async () => {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!name) errors.nome = 'Nome é obrigatório.';
    if (!regEmail) errors.email = 'E-mail é obrigatório.';
    if (!cnpjCpf) errors.cpf_cnpj = 'CPF/CNPJ é obrigatório.';
    if (!phone) errors.telefone = 'Telefone é obrigatório.';
    if (!address) errors.endereco = 'Endereço é obrigatório.';
    if (!password || password.length < 6) errors.senha = 'Mínimo 6 caracteres.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Verifique os campos obrigatórios.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await register({
        nome: name, email: regEmail, senha: password, tipo: 'doador',
        cpf_cnpj: cnpjCpf, endereco: address, telefone: phone,
      });
      setSuccessMsg('Cadastro de Doador realizado!');
      setName(''); setRegEmail(''); setCnpjCpf(''); setPhone(''); setAddress(''); setPassword('');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNgo = async () => {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!name) errors.nome = 'Nome é obrigatório.';
    if (!regEmail) errors.email = 'E-mail é obrigatório.';
    if (!cnpjCpf) errors.cnpj = 'CNPJ é obrigatório.';
    if (!address) errors.endereco = 'Endereço é obrigatório.';
    if (!capacity) errors.capacidade = 'Capacidade é obrigatória.';
    if (!password || password.length < 6) errors.senha = 'Mínimo 6 caracteres.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Verifique os campos obrigatórios.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const coords = await geocodeAddress(address);
      const ongPayload: Record<string, any> = {
        cnpj: cnpjCpf,
        capacidade_atendimento: parseInt(capacity) || 100,
      };
      if (coords) {
        ongPayload.latitude = coords.latitude;
        ongPayload.longitude = coords.longitude;
      }

      await register({
        nome: name, email: regEmail, senha: password, tipo: 'ong',
        cpf_cnpj: cnpjCpf, endereco: address,
        ong: ongPayload,
      });
      setSuccessMsg('Cadastro de ONG realizado!');
      setName(''); setRegEmail(''); setCnpjCpf(''); setAddress(''); setCapacity(''); setPassword('');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <SymbolView
              name={(Platform.OS === 'ios' ? 'fork.knife.circle.fill' : 'restaurant') as any}
              size={48}
              tintColor="#3c87f7"
            />
          </View>
          <ThemedText type="title" style={styles.brandTitle}>AlimentAÇÃO</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.brandSubtitle}>
            Inteligência Preditiva no Combate ao Desperdício de Alimentos
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.containerCard}>
          {/* Mode Toggle */}
          <View style={styles.tabHeaders}>
            <Pressable
              style={[styles.tabHeaderBtn, mode === 'donor' && { borderBottomColor: '#3c87f7', borderBottomWidth: 3 }]}
              onPress={() => { setMode('donor'); setErrorMsg(''); clearFieldErrors(); }}
            >
              <ThemedText type="smallBold" style={mode === 'donor' ? { color: '#3c87f7' } : { color: theme.textSecondary }}>
                + Doador
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.tabHeaderBtn, mode === 'ngo' && { borderBottomColor: '#3c87f7', borderBottomWidth: 3 }]}
              onPress={() => { setMode('ngo'); setErrorMsg(''); clearFieldErrors(); }}
            >
              <ThemedText type="smallBold" style={mode === 'ngo' ? { color: '#3c87f7' } : { color: theme.textSecondary }}>
                + ONG
              </ThemedText>
            </Pressable>
          </View>

          {/* Feedback Messages */}
          {errorMsg !== '' && (
            <View style={styles.errorContainer}>
              <ThemedText type="small" style={styles.errorText}>{errorMsg}</ThemedText>
            </View>
          )}
          {successMsg !== '' && (
            <View style={styles.successContainer}>
              <ThemedText type="small" style={styles.successText}>{successMsg}</ThemedText>
            </View>
          )}

          {/* --- REGISTER DONOR MODE --- */}
          {mode === 'donor' && (
            <View style={styles.formContainer}>
              <ThemedText type="subtitle" style={styles.sectionHeader}>Cadastro de Doador</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionDesc}>
                Estabelecimentos comerciais, feiras ou restaurantes.
              </ThemedText>

              <ThemedText type="smallBold" style={styles.inputLabel}>Nome do Estabelecimento / Fantasia</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: Supermercado Preço Bom"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>E-mail</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="seu@email.com"
                placeholderTextColor={theme.textSecondary}
                value={regEmail}
                onChangeText={setRegEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>CNPJ ou CPF do Doador</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: 12.345.678/0001-90"
                placeholderTextColor={theme.textSecondary}
                value={cnpjCpf}
                onChangeText={setCnpjCpf}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Endereço Completo</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Rua, Número, Bairro, Cidade - Estado"
                placeholderTextColor={theme.textSecondary}
                value={address}
                onChangeText={setAddress}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Telefone / WhatsApp</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: (11) 99999-8888"
                placeholderTextColor={theme.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Definir Senha de Acesso</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Pressable
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegisterDonor}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText type="smallBold" style={styles.submitBtnText}>Finalizar Cadastro de Doador</ThemedText>
                )}
              </Pressable>
            </View>
          )}

          {/* --- REGISTER NGO MODE --- */}
          {mode === 'ngo' && (
            <View style={styles.formContainer}>
              <ThemedText type="subtitle" style={styles.sectionHeader}>Cadastro de ONG / Banco</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionDesc}>
                Entidades receptoras, abrigos e cozinhas comunitárias.
              </ThemedText>

              <ThemedText type="smallBold" style={styles.inputLabel}>Nome da Entidade</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: Banco de Alimentos Solidário"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>E-mail</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="contato@ong.org.br"
                placeholderTextColor={theme.textSecondary}
                value={regEmail}
                onChangeText={setRegEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>CNPJ da Instituição</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: 55.666.777/0001-88"
                placeholderTextColor={theme.textSecondary}
                value={cnpjCpf}
                onChangeText={setCnpjCpf}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Endereço da Sede</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Rua, Número, Bairro, Cidade - Estado"
                placeholderTextColor={theme.textSecondary}
                value={address}
                onChangeText={setAddress}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Capacidade de Atendimento Semanal (Pessoas)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: 350"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Definir Senha de Acesso</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Pressable
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegisterNgo}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText type="smallBold" style={styles.submitBtnText}>Finalizar Cadastro de ONG</ThemedText>
                )}
              </Pressable>
            </View>
          )}

          {/* Link to Login */}
          <Pressable onPress={() => router.push('/login')} style={styles.loginLink}>
            <ThemedText type="small" themeColor="textSecondary">
              Já tem conta? <ThemedText type="linkPrimary">Entrar</ThemedText>
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.four,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3c87f722',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  containerCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.08)',
  },
  tabHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    marginBottom: Spacing.four,
  },
  tabHeaderBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  successText: {
    color: '#2e7d32',
  },
  formContainer: {
    gap: Spacing.two,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionDesc: {
    marginBottom: Spacing.two,
  },
  inputLabel: {
    fontSize: 13,
    marginTop: Spacing.two,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  submitBtn: {
    height: 50,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
  },
  loginLink: {
    alignSelf: 'center',
    marginTop: Spacing.three,
    padding: Spacing.two,
  },
});
