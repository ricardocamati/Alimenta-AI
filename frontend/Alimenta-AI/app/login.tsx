import { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  View,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

function inferTipoFromEmail(email: string): 'doador' | 'ong' | 'admin' | null {
  const localPart = email.split('@')[0].toLowerCase();
  if (localPart.includes('ong')) return 'ong';
  if (localPart.includes('admin')) return 'admin';
  if (localPart.includes('doador')) return 'doador';
  return null;
}

export default function LoginScreen() {
  const { user, login } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password recovery modal state
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Redirect if already logged in (guard against double redirect)
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      const inferredTipo = user.email ? inferTipoFromEmail(user.email) : null;
      const effectiveTipo = inferredTipo && inferredTipo !== user.tipo
        ? inferredTipo
        : user.tipo;
      if (effectiveTipo === 'doador') router.replace('/donor');
      else if (effectiveTipo === 'ong') router.replace('/ngo');
      else router.replace('/admin');
    }
  }, [user]);

  const handleLogin = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) {
      setErrorMsg('Preencha seu e-mail e senha.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login({ email: e, senha: p });
      setEmail('');
      setPassword('');
    } catch (err: any) {
      const msg = err.message || 'Erro ao fazer login.';
      if (msg.toLowerCase().includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('sessão expirada')) {
        setErrorMsg('E-mail ou senha incorretos.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = () => {
    if (!recoveryEmail) {
      alert('Por favor, informe seu e-mail.');
      return;
    }
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
          <ThemedText type="title" style={styles.brandTitle}>AlimentAÇÃO</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.brandSubtitle}>
            Inteligência Preditiva no Combate ao Desperdício de Alimentos
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.containerCard}>
          <ThemedText type="subtitle" style={styles.sectionHeader}>Acesse sua conta</ThemedText>

          {errorMsg !== '' && (
            <View style={styles.errorContainer}>
              <ThemedText type="small" style={styles.errorText}>{errorMsg}</ThemedText>
            </View>
          )}

          <ThemedText type="smallBold" style={styles.inputLabel}>E-mail</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
            placeholder="seu@email.com"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => { /* focus next field */ }}
          />

          <ThemedText type="smallBold" style={styles.inputLabel}>Senha de Acesso</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
            placeholder="Digite sua senha"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {/* Forgot Password Button */}
          <Pressable onPress={() => setRecoveryModalVisible(true)} style={styles.forgotBtn}>
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

          {/* Link to Register */}
          <Pressable onPress={() => router.push('/register')} style={styles.registerLink}>
            <ThemedText type="small" themeColor="textSecondary">
              Não tem conta? <ThemedText type="linkPrimary">Cadastre-se</ThemedText>
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Recovery Password Modal */}
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

                <Pressable style={styles.submitBtn} onPress={handlePasswordRecovery}>
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
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.08)',
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.three,
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
  registerLink: {
    alignSelf: 'center',
    marginTop: Spacing.three,
    padding: Spacing.two,
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
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
    }),
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
