import { useEffect, useState, useRef, useCallback } from 'react';
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
import { lookupCEP, type CEPData } from '@/services/cepService';
import {
  maskCpfCnpj,
  maskPhone,
  maskCEP,
  isValidCpfCnpjFormat,
  isValidCEP,
  isValidPhone,
} from '@/utils/masks';

export default function RegisterScreen() {
  const { user, register } = useAuth();
  const theme = useTheme();

  const [mode, setMode] = useState<'donor' | 'ngo'>('donor');

  // Common
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Endereço estruturado
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');

  // NGO only
  const [capacity, setCapacity] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const redirectedRef = useRef(false);
  useEffect(() => {
    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      if (user.tipo === 'doador') router.replace('/donor');
      else if (user.tipo === 'ong') router.replace('/ngo');
      else router.replace('/admin');
    }
  }, [user]);

  const clearFieldErrors = () => setFieldErrors({});

  // Auto-busca CEP: dispara quando CEP tem 8 dígitos
  const fetchCepData = useCallback(async (rawCep: string) => {
    if (!isValidCEP(rawCep)) {
      setCepStatus('idle');
      return;
    }
    setCepStatus('loading');
    const data: CEPData | null = await lookupCEP(rawCep);
    if (data) {
      setLogradouro(data.logradouro);
      setBairro(data.bairro);
      setCidade(data.cidade);
      setUf(data.uf);
      if (data.complemento && !complemento) setComplemento(data.complemento);
      if (data.latitude != null && data.longitude != null) {
        setCoords({ lat: data.latitude, lon: data.longitude });
      }
      setCepStatus('found');
      setErrorMsg('');
    } else {
      setCepStatus('error');
    }
  }, [complemento]);

  // Debounce da busca de CEP
  useEffect(() => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepStatus('idle');
      return;
    }
    if (cepStatus === 'found' || cepStatus === 'loading') return;
    const t = setTimeout(() => fetchCepData(cep), 600);
    return () => clearTimeout(t);
  }, [cep, cepStatus, fetchCepData]);

  // Botão "usar minha localização" — removido (a ONG pode usar o CEP)

  const buildFullAddress = () =>
    [logradouro, numero, complemento, bairro, cidade, uf, cep]
      .filter(Boolean)
      .join(', ');

  const validateCommon = (errors: Record<string, string>) => {
    if (!name) errors.nome = 'Nome é obrigatório.';
    if (!regEmail || !regEmail.includes('@')) errors.email = 'E-mail inválido.';
    if (!isValidCpfCnpjFormat(cnpjCpf)) errors.cpf_cnpj = 'Formato deve ser 000.000.000-00 ou 00.000.000/0000-00.';
    if (!isValidPhone(phone)) errors.telefone = 'Telefone inválido.';
    if (!cep) errors.cep = 'CEP é obrigatório.';
    else if (!isValidCEP(cep)) errors.cep = 'CEP deve ter 8 dígitos.';
    if (!logradouro) errors.logradouro = 'Logradouro é obrigatório.';
    if (!numero) errors.numero = 'Número é obrigatório.';
    if (!bairro) errors.bairro = 'Bairro é obrigatório.';
    if (!cidade) errors.cidade = 'Cidade é obrigatória.';
    if (!uf || uf.length !== 2) errors.uf = 'UF deve ter 2 letras (ex: SP).';
    if (!password || password.length < 6) errors.senha = 'Mínimo 6 caracteres.';
  };

  const handleRegisterDonor = async () => {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    validateCommon(errors);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Verifique os campos destacados.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const fullAddress = buildFullAddress();
      await register({
        nome: name,
        email: regEmail,
        senha: password,
        tipo: 'doador',
        cpf_cnpj: cnpjCpf,
        endereco: fullAddress,
        telefone: phone,
      });
      setSuccessMsg('Cadastro de Doador realizado!');
      setName(''); setRegEmail(''); setCnpjCpf(''); setPhone(''); setPassword('');
      setCep(''); setLogradouro(''); setNumero(''); setComplemento(''); setBairro(''); setCidade(''); setUf('');
      setCoords(null);
      setCepStatus('idle');
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
    validateCommon(errors);
    if (!capacity || parseInt(capacity) < 1) errors.capacidade = 'Capacidade deve ser > 0.';
    if (!coords) errors.coords = 'Coordenadas ausentes — busque por CEP ou use o botão de GPS.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Verifique os campos destacados.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const fullAddress = buildFullAddress();
      await register({
        nome: name,
        email: regEmail,
        senha: password,
        tipo: 'ong',
        cpf_cnpj: cnpjCpf,
        endereco: fullAddress,
        telefone: phone,
        ong: {
          cnpj: cnpjCpf,
          capacidade_atendimento: parseInt(capacity) || 100,
          latitude: coords!.lat,
          longitude: coords!.lon,
        },
      });
      setSuccessMsg('Cadastro de ONG realizado!');
      setName(''); setRegEmail(''); setCnpjCpf(''); setPhone(''); setPassword('');
      setCep(''); setLogradouro(''); setNumero(''); setComplemento(''); setBairro(''); setCidade(''); setUf('');
      setCoords(null);
      setCepStatus('idle');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  // Componentes reutilizáveis
  const Label = ({ text, error }: { text: string; error?: string }) => (
    <View style={styles.labelRow}>
      <ThemedText type="smallBold" style={{ color: error ? '#f44336' : undefined }}>
        {text}
      </ThemedText>
      {error && <ThemedText type="code" style={styles.errorHint}>{error}</ThemedText>}
    </View>
  );

  const Input = (props: React.ComponentProps<typeof TextInput> & { hasError?: boolean }) => (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.background,
          borderColor: props.hasError ? '#f44336' : theme.backgroundSelected,
        },
        props.style,
      ]}
    />
  );

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            {Platform.OS === 'web' ? (
              <ThemedText style={{ fontSize: 28 }}>🍽️</ThemedText>
            ) : (
              <SymbolView
                name={(Platform.OS === 'ios' ? 'fork.knife.circle.fill' : 'restaurant') as any}
                size={48}
                tintColor="#3c87f7"
              />
            )}
          </View>
          <ThemedText type="title" style={styles.brandTitle}>Alimenta-IA</ThemedText>
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

          <View style={styles.formContainer}>
            <ThemedText type="subtitle" style={styles.sectionHeader}>
              {mode === 'donor' ? 'Cadastro de Doador' : 'Cadastro de ONG / Banco'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionDesc}>
              {mode === 'donor'
                ? 'Estabelecimentos comerciais, feiras ou restaurantes.'
                : 'Entidades receptoras, abrigos e cozinhas comunitárias.'}
            </ThemedText>

            <Label text="Nome / Razão Social" error={fieldErrors.nome} />
            <Input
              placeholder={mode === 'donor' ? 'Ex: Supermercado Preço Bom' : 'Ex: Banco de Alimentos Solidário'}
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              hasError={!!fieldErrors.nome}
            />

            <Label text="E-mail" error={fieldErrors.email} />
            <Input
              placeholder="seu@email.com"
              placeholderTextColor={theme.textSecondary}
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              hasError={!!fieldErrors.email}
            />

            <Label
              text={mode === 'donor' ? 'CPF ou CNPJ' : 'CNPJ da Instituição'}
              error={fieldErrors.cpf_cnpj}
            />
            <Input
              placeholder={mode === 'donor' ? 'CPF: 000.000.000-00 ou CNPJ: 00.000.000/0000-00' : '00.000.000/0000-00'}
              placeholderTextColor={theme.textSecondary}
              value={cnpjCpf}
              onChangeText={(v) => setCnpjCpf(maskCpfCnpj(v))}
              keyboardType="numeric"
              maxLength={18}
              hasError={!!fieldErrors.cpf_cnpj}
            />

            <Label text="Telefone / WhatsApp" error={fieldErrors.telefone} />
            <Input
              placeholder="(11) 99999-8888"
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={(v) => setPhone(maskPhone(v))}
              keyboardType="phone-pad"
              autoComplete="tel"
              hasError={!!fieldErrors.telefone}
            />

            {/* === ENDEREÇO ESTRUTURADO === */}
            <View style={styles.sectionDivider} />
            <ThemedText type="smallBold" style={styles.sectionSubHeader}>
              📍 Endereço
            </ThemedText>

            <Label text="CEP" error={fieldErrors.cep} />
            <View style={styles.cepRow}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="00000-000"
                  placeholderTextColor={theme.textSecondary}
                  value={cep}
                  onChangeText={(v) => setCep(maskCEP(v))}
                  keyboardType="numeric"
                  autoComplete="postal-code"
                  hasError={!!fieldErrors.cep}
                />
              </View>
              <View style={styles.cepStatusBox}>
                {cepStatus === 'loading' && <ActivityIndicator color="#3c87f7" size="small" />}
                {cepStatus === 'found' && <ThemedText style={{ color: '#4caf50', fontSize: 18 }}>✓</ThemedText>}
                {cepStatus === 'error' && <ThemedText style={{ color: '#f44336', fontSize: 11 }}>não encontrado</ThemedText>}
              </View>
            </View>

            <Label text="Logradouro (Rua/Av.)" error={fieldErrors.logradouro} />
            <Input
              placeholder="Ex: Avenida Paulista"
              placeholderTextColor={theme.textSecondary}
              value={logradouro}
              onChangeText={setLogradouro}
              autoComplete="street-address"
              hasError={!!fieldErrors.logradouro}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Label text="Número" error={fieldErrors.numero} />
                <Input
                  placeholder="100"
                  placeholderTextColor={theme.textSecondary}
                  value={numero}
                  onChangeText={setNumero}
                  keyboardType="numeric"
                  hasError={!!fieldErrors.numero}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Label text="Complemento (opcional)" />
                <Input
                  placeholder="Sala 12 / Fundos"
                  placeholderTextColor={theme.textSecondary}
                  value={complemento}
                  onChangeText={setComplemento}
                />
              </View>
            </View>

            <Label text="Bairro" error={fieldErrors.bairro} />
            <Input
              placeholder="Ex: Bela Vista"
              placeholderTextColor={theme.textSecondary}
              value={bairro}
              onChangeText={setBairro}
              hasError={!!fieldErrors.bairro}
            />

            <View style={styles.row2}>
              <View style={{ flex: 2 }}>
                <Label text="Cidade" error={fieldErrors.cidade} />
                <Input
                  placeholder="São Paulo"
                  placeholderTextColor={theme.textSecondary}
                  value={cidade}
                  onChangeText={setCidade}
                  autoComplete="address-level2"
                  hasError={!!fieldErrors.cidade}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="UF" error={fieldErrors.uf} />
                <Input
                  placeholder="SP"
                  placeholderTextColor={theme.textSecondary}
                  value={uf}
                  onChangeText={(v) => setUf(v.toUpperCase().slice(0, 2))}
                  autoCapitalize="characters"
                  autoComplete="address-level1"
                  maxLength={2}
                  hasError={!!fieldErrors.uf}
                />
              </View>
            </View>

            {/* Coordenadas (auto via CEP) — card removido */}

            {/* NGO: capacidade */}
            {mode === 'ngo' && (
              <>
                <View style={styles.sectionDivider} />
                <Label text="Capacidade Semanal de Atendimento (Pessoas)" error={fieldErrors.capacidade} />
                <Input
                  placeholder="Ex: 350"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={capacity}
                  onChangeText={setCapacity}
                  hasError={!!fieldErrors.capacidade}
                />
              </>
            )}

            <View style={styles.sectionDivider} />
            <Label text="Senha de Acesso" error={fieldErrors.senha} />
            <Input
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              hasError={!!fieldErrors.senha}
            />

            <Pressable
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={mode === 'donor' ? handleRegisterDonor : handleRegisterNgo}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.submitBtnText}>
                  {mode === 'donor' ? 'Finalizar Cadastro de Doador' : 'Finalizar Cadastro de ONG'}
                </ThemedText>
              )}
            </Pressable>
          </View>

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
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: Spacing.four },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three, paddingTop: Spacing.four },
  brandContainer: { alignItems: 'center', marginVertical: Spacing.four },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#3c87f722',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.two,
  },
  brandTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  brandSubtitle: { textAlign: 'center', marginTop: Spacing.one, paddingHorizontal: Spacing.four },
  containerCard: {
    borderRadius: Spacing.four, padding: Spacing.four,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
      },
    }),
    borderWidth: 1, borderColor: 'rgba(150, 150, 150, 0.08)',
  },
  tabHeaders: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(150, 150, 150, 0.15)', marginBottom: Spacing.four },
  tabHeaderBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three },
  errorContainer: { backgroundColor: '#ffebee', padding: Spacing.three, borderRadius: Spacing.two, marginBottom: Spacing.four, borderLeftWidth: 4, borderLeftColor: '#f44336' },
  errorText: { color: '#c62828' },
  successContainer: { backgroundColor: '#e8f5e9', padding: Spacing.three, borderRadius: Spacing.two, marginBottom: Spacing.four, borderLeftWidth: 4, borderLeftColor: '#4caf50' },
  successText: { color: '#2e7d32' },
  formContainer: { gap: Spacing.two },
  sectionHeader: { fontSize: 22, fontWeight: '700' },
  sectionSubHeader: { fontSize: 15, fontWeight: '700', marginTop: Spacing.two },
  sectionDesc: { marginBottom: Spacing.two },
  sectionDivider: { height: 1, backgroundColor: 'rgba(150, 150, 150, 0.15)', marginVertical: Spacing.three },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.two },
  errorHint: { fontSize: 10, color: '#f44336' },
  input: { height: 48, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, fontSize: 15 },
  row2: { flexDirection: 'row', gap: Spacing.two },
  cepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cepStatusBox: { width: 90, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { height: 50, backgroundColor: '#3c87f7', borderRadius: Spacing.two, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.three },
  submitBtnText: { color: '#ffffff', fontSize: 16 },
  loginLink: { alignSelf: 'center', marginTop: Spacing.three, padding: Spacing.two },
});
