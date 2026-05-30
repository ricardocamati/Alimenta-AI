import React, { useState } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ScrollView, 
  Platform, 
  View, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';

export default function PortalScreen() {
  const store = useStore();
  const theme = useTheme();

  // Mode state: 'login' | 'register-donor' | 'register-ngo'
  const [mode, setMode] = useState<'login' | 'register-donor' | 'register-ngo'>('login');
  // Selected role for login: 'donor' | 'ngo' | 'admin'
  const [loginRole, setLoginRole] = useState<'donor' | 'ngo' | 'admin'>('donor');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  
  // Password recovery modal state
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      const success = store.login(loginRole, email);
      if (success) {
        setSuccessMsg(`Logado com sucesso como ${loginRole === 'admin' ? 'Administrador' : email}!`);
        setEmail('');
        setPassword('');
        // Redirect to dashboard page based on role
        setTimeout(() => {
          setSuccessMsg('');
          if (loginRole === 'donor') {
            router.push('/donor');
          } else if (loginRole === 'ngo') {
            router.push('/ngo');
          } else {
            router.push('/admin');
          }
        }, 1000);
      }
    }, 1200);
  };

  const handleRegisterDonor = () => {
    if (!name || !cnpjCpf || !phone || !address || !password) {
      setErrorMsg('Todos os campos são obrigatórios.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      try {
        store.registerDonor({
          name,
          cnpjCpf,
          address,
          phone
        });
        setSuccessMsg('Cadastro de Doador realizado com sucesso!');
        // Reset fields
        setName('');
        setCnpjCpf('');
        setPhone('');
        setAddress('');
        setPassword('');
        setTimeout(() => {
          setSuccessMsg('');
          router.push('/donor');
        }, 1000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao realizar cadastro.');
      }
    }, 1200);
  };

  const handleRegisterNgo = () => {
    if (!name || !cnpjCpf || !address || !capacity || !password) {
      setErrorMsg('Todos os campos são obrigatórios.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      try {
        store.registerNgo({
          name,
          cnpj: cnpjCpf,
          address,
          capacity: parseInt(capacity) || 100
        });
        setSuccessMsg('Cadastro de ONG realizado com sucesso!');
        setName('');
        setCnpjCpf('');
        setAddress('');
        setCapacity('');
        setPassword('');
        setTimeout(() => {
          setSuccessMsg('');
          router.push('/ngo');
        }, 1000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao realizar cadastro.');
      }
    }, 1200);
  };

  const handlePasswordRecovery = () => {
    if (!recoveryEmail) {
      alert('Por favor, informe seu e-mail.');
      return;
    }
    store.recoverPassword(recoveryEmail);
    setRecoveryModalVisible(false);
    setRecoveryEmail('');
    alert('Link de recuperação enviado por e-mail!');
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

        {/* Logged In Info Indicator */}
        {store.currentUser && (
          <ThemedView type="backgroundSelected" style={styles.activeSessionCard}>
              <SymbolView 
                name={(Platform.OS === 'ios' ? 'person.crop.circle.badge.checkmark' : 'account_circle') as any}
                size={24} 
                tintColor="#4caf50"
              />
            <View style={{ flex: 1, marginLeft: Spacing.two }}>
              <ThemedText type="smallBold">Sessão Ativa</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Conectado como {store.currentUser.name} ({store.currentUser.role.toUpperCase()})
              </ThemedText>
            </View>
            <Pressable 
              onPress={() => {
                if (store.currentUser?.role === 'donor') router.push('/donor');
                else if (store.currentUser?.role === 'ngo') router.push('/ngo');
                else router.push('/admin');
              }}
              style={styles.actionSessionBtn}
            >
              <ThemedText type="code" style={styles.actionSessionBtnText}>Entrar</ThemedText>
            </Pressable>
            <Pressable onPress={() => store.logout()} style={styles.logoutBtn}>
              <SymbolView name="power" size={20} tintColor="#f44336" />
            </Pressable>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.containerCard}>
          {/* Tabs for Mode Selection */}
          <View style={styles.tabHeaders}>
            <Pressable 
              style={[styles.tabHeaderBtn, mode === 'login' && { borderBottomColor: '#3c87f7', borderBottomWidth: 3 }]}
              onPress={() => { setMode('login'); setErrorMsg(''); }}
            >
              <ThemedText type="smallBold" style={mode === 'login' ? { color: '#3c87f7' } : { color: theme.textSecondary }}>
                Login
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.tabHeaderBtn, mode === 'register-donor' && { borderBottomColor: '#3c87f7', borderBottomWidth: 3 }]}
              onPress={() => { setMode('register-donor'); setErrorMsg(''); }}
            >
              <ThemedText type="smallBold" style={mode === 'register-donor' ? { color: '#3c87f7' } : { color: theme.textSecondary }}>
                + Doador
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.tabHeaderBtn, mode === 'register-ngo' && { borderBottomColor: '#3c87f7', borderBottomWidth: 3 }]}
              onPress={() => { setMode('register-ngo'); setErrorMsg(''); }}
            >
              <ThemedText type="smallBold" style={mode === 'register-ngo' ? { color: '#3c87f7' } : { color: theme.textSecondary }}>
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

          {/* --- LOGIN MODE --- */}
          {mode === 'login' && (
            <View style={styles.formContainer}>
              <ThemedText type="smallBold" style={styles.formLabel}>Acessar como:</ThemedText>
              
              {/* Login Role Selector */}
              <View style={styles.roleRow}>
                <Pressable 
                  style={[styles.roleBtn, loginRole === 'donor' && styles.roleBtnSelected, { borderColor: theme.backgroundSelected }]}
                  onPress={() => setLoginRole('donor')}
                >
                  <SymbolView name="storefront" size={20} tintColor={loginRole === 'donor' ? '#ffffff' : '#3c87f7'} />
                  <ThemedText type="small" style={[styles.roleBtnText, loginRole === 'donor' && { color: '#ffffff' }]}>
                    Doador
                  </ThemedText>
                </Pressable>
                
                <Pressable 
                  style={[styles.roleBtn, loginRole === 'ngo' && styles.roleBtnSelected, { borderColor: theme.backgroundSelected }]}
                  onPress={() => setLoginRole('ngo')}
                >
                  <SymbolView name="hands.sparkles" size={20} tintColor={loginRole === 'ngo' ? '#ffffff' : '#3c87f7'} />
                  <ThemedText type="small" style={[styles.roleBtnText, loginRole === 'ngo' && { color: '#ffffff' }]}>
                    ONG
                  </ThemedText>
                </Pressable>

                <Pressable 
                  style={[styles.roleBtn, loginRole === 'admin' && styles.roleBtnSelected, { borderColor: theme.backgroundSelected }]}
                  onPress={() => setLoginRole('admin')}
                >
                  <SymbolView name="slider.horizontal.3" size={20} tintColor={loginRole === 'admin' ? '#ffffff' : '#3c87f7'} />
                  <ThemedText type="small" style={[styles.roleBtnText, loginRole === 'admin' && { color: '#ffffff' }]}>
                    Admin
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldHint}>
                {'* Digite o nome do cadastro de teste para entrar automaticamente (ex: "Supermercado" ou "Prato Cheio").'}
              </ThemedText>

              {/* Email / Username Input */}
              <ThemedText type="smallBold" style={styles.inputLabel}>Identificação (Nome / E-mail / CNPJ)</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder={loginRole === 'admin' ? 'Identificação do Administrador' : 'Digite o nome ou CNPJ do seu estabelecimento'}
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />

              {/* Password Input */}
              <ThemedText type="smallBold" style={styles.inputLabel}>Senha de Acesso</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="******"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {/* Forgot Password Button */}
              <Pressable 
                onPress={() => setRecoveryModalVisible(true)} 
                style={styles.forgotBtn}
              >
                <ThemedText type="linkPrimary">Esqueceu sua senha?</ThemedText>
              </Pressable>

              {/* Submit Button */}
              <Pressable 
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText type="smallBold" style={styles.submitBtnText}>Entrar com Segurança</ThemedText>
                )}
              </Pressable>
            </View>
          )}

          {/* --- REGISTER DONOR MODE --- */}
          {mode === 'register-donor' && (
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
          {mode === 'register-ngo' && (
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

        </ThemedView>

        {/* Recovery Password Modal (RF-04) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={recoveryModalVisible}
          onRequestClose={() => setRecoveryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold">Recuperação de Senha</ThemedText>
                <Pressable onPress={() => setRecoveryModalVisible(false)}>
                  <SymbolView name="xmark" size={20} tintColor={theme.text} />
                </Pressable>
              </View>
              
              <View style={styles.modalBody}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.modalDesc}>
                  Informe seu e-mail cadastrado. Enviaremos um link seguro para a alteração da sua senha.
                </ThemedText>
                
                <TextInput 
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                  placeholder="Ex: contato@estabelecimento.com.br"
                  placeholderTextColor={theme.textSecondary}
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <Pressable 
                  style={styles.submitBtn}
                  onPress={handlePasswordRecovery}
                >
                  <ThemedText type="smallBold" style={styles.submitBtnText}>Enviar E-mail de Recuperação</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </Modal>

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
    paddingBottom: BottomTabInset + Spacing.four,
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
  activeSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#4caf5044',
  },
  actionSessionBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    marginRight: Spacing.two,
  },
  actionSessionBtnText: {
    color: '#ffffff',
    fontSize: 12,
  },
  logoutBtn: {
    padding: Spacing.two,
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
  formLabel: {
    marginBottom: Spacing.one,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  roleBtnSelected: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  roleBtnText: {
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 12,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginVertical: Spacing.one,
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
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionDesc: {
    marginBottom: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    paddingBottom: Spacing.two,
    marginBottom: Spacing.three,
  },
  modalBody: {
    gap: Spacing.three,
  },
  modalDesc: {
    lineHeight: 20,
  },
});
