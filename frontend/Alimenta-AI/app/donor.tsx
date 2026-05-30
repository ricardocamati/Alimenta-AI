import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ScrollView, 
  View, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Donation, useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';

// Preset metadata used for seeded donations and fallback cards.
const FOOD_PHOTOS = [
  { id: 'tomatoes', name: 'Tomates', emoji: '🍅', color: '#ff5252', url: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=120' },
  { id: 'bread', name: 'Pão Caseiro', emoji: '🍞', color: '#ffa726', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120' },
  { id: 'oranges', name: 'Laranjas', emoji: '🍊', color: '#ffb74d', url: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=120' },
  { id: 'milk', name: 'Leite Longa Vida', emoji: '🥛', color: '#e0e0e0', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120' },
  { id: 'vegetables', name: 'Cesta de Verduras', emoji: '🥬', color: '#81c784', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=120' },
  { id: 'meats', name: 'Carne Bovina', emoji: '🥩', color: '#e57373', url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=120' },
];

export default function DonorScreen() {
  const store = useStore();
  const theme = useTheme();

  // Route protection - check if user is donor
  const isDonorLoggedIn = !!(store.currentUser && store.currentUser.role === 'donor');
  const activeDonorId = isDonorLoggedIn && store.currentUser ? store.currentUser.id : 'donor_1';
  const activeDonorName = isDonorLoggedIn && store.currentUser ? store.currentUser.name : 'Supermercado Central';

  // --- 3-STEP DONATION FORM STATES ---
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  
  // Step 1 States
  const [foodName, setFoodName] = useState('');
  const [foodType, setFoodType] = useState('Fruta/Legume'); // e.g. Laticínio, Carne, Panificação
  const [category, setCategory] = useState<'Perecível' | 'Não Perecível'>('Perecível');
  const [quantity, setQuantity] = useState('');

  // Step 2 States
  const [expiryDate, setExpiryDate] = useState(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  });
  const [storageConditions, setStorageConditions] = useState('Temperatura Ambiente');
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  // Form Submission feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- OTHER STATES ---
  const [showCertificate, setShowCertificate] = useState(false);

  // Filter donations and notifications for this specific donor
  const donorDonations = store.donations.filter(d => d.donorId === activeDonorId);
  const donorNotifications = store.notifications.filter(n => n.userId === activeDonorId);

  // Calculate stats dynamically (RF-23)
  const totalDonationsCount = donorDonations.length;
  
  const totalWeightKg = donorDonations
    .filter(d => d.status === 'Confirmado' || d.status === 'Coletado')
    .reduce((acc, d) => {
      const val = parseFloat(d.quantity) || 0;
      return acc + val;
    }, 0);

  const pendingDonationsCount = donorDonations.filter(d => 
    ['Cadastrado', 'Analisado', 'Matched', 'Notificado'].includes(d.status)
  ).length;

  const handleNextStep1 = () => {
    if (!foodName || !quantity) {
      setErrorMsg('Preencha o nome do alimento e a quantidade.');
      return;
    }
    setErrorMsg('');
    setFormStep(2);
  };

  const handleNextStep2 = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDate);
    
    // RF-08 Expiry Validation
    if (expiry <= today) {
      setErrorMsg('A data de validade deve ser uma data futura.');
      return;
    }
    if (!photoAsset) {
      setErrorMsg('Capture ou selecione uma foto real do alimento antes de avançar.');
      return;
    }
    setErrorMsg('');
    setFormStep(3);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (formStep === 2) setFormStep(1);
    if (formStep === 3) setFormStep(2);
  };

  const capturePhoto = async () => {
    try {
      setLoadingPhoto(true);
      setErrorMsg('');

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Permissão de câmera negada. Habilite a câmera para continuar.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhotoAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Erro na câmera', 'Não foi possível abrir a câmera neste dispositivo.');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const pickPhotoFromLibrary = async () => {
    try {
      setLoadingPhoto(true);
      setErrorMsg('');

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Permissão de galeria negada. Habilite o acesso às fotos para continuar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhotoAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Erro na galeria', 'Não foi possível selecionar uma imagem neste dispositivo.');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleRegisterDonation = () => {
    if (!photoAsset) {
      setErrorMsg('Capture ou selecione uma foto real do alimento antes de publicar.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      try {
        const donation = store.registerDonation({
          name: foodName,
          type: foodType,
          category,
          quantity,
          expiryDate,
          photoUrl: photoAsset.uri,
          storageConditions
        });
        
        setLoading(false);
        setSuccessMsg(`Doação "${donation.name}" cadastrada com sucesso!`);
        
        // Reset form
        setFoodName('');
        setFoodType('Fruta/Legume');
        setCategory('Perecível');
        setQuantity('');
        setStorageConditions('Temperatura Ambiente');
        setPhotoAsset(null);
        setFormStep(1);
        
        // Clear message
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(err.message || 'Erro ao registrar doação.');
      }
    }, 1200);
  };

  const getDonationPhoto = (donation: Donation) => {
    const photoValue = donation.photoUrl || donation.photoId;
    const preset = FOOD_PHOTOS.find(p => p.id === photoValue);

    return {
      preset: preset || FOOD_PHOTOS[4],
      uri: preset ? null : photoValue,
    };
  };

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nearExpiryCount = donorDonations.filter(d => {
      const expiry = new Date(d.expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && !['Confirmado', 'Coletado', 'Cancelado'].includes(d.status);
    }).length;

    if (nearExpiryCount > 0) {
      store.triggerExpiryAlerts();
    }
  }, []);

  // Helper for status styling
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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* Welcome Header */}
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="subtitle">Portal do Doador</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Conectado: <ThemedText type="smallBold">{activeDonorName}</ThemedText>
            </ThemedText>
          </View>
          {!isDonorLoggedIn && (
            <Pressable style={styles.loginHintBtn} onPress={() => router.replace('/')}>
              <ThemedText type="code" style={{ color: '#ffffff', fontSize: 11 }}>Fazer Login</ThemedText>
            </Pressable>
          )}
        </ThemedView>

        {/* Dashboard Metrics (RF-23, RF-25) */}
        <View style={styles.kpiContainer}>
          <ThemedView type="backgroundElement" style={styles.kpiCard}>
            <SymbolView name="checkmark.circle" size={24} tintColor="#4caf50" />
            <ThemedText type="subtitle" style={styles.kpiValue}>{totalDonationsCount}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Total Doados</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.kpiCard}>
            <SymbolView name="leaf.fill" size={24} tintColor="#81c784" />
            <ThemedText type="subtitle" style={styles.kpiValue}>{totalWeightKg} kg</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Alimentos Coletados</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.kpiCard}>
            <SymbolView name="hourglass" size={24} tintColor="#ffb74d" />
            <ThemedText type="subtitle" style={styles.kpiValue}>{pendingDonationsCount}</ThemedText>
            <ThemedText type="code" style={styles.kpiLabel}>Em Análise/Coleta</ThemedText>
          </ThemedView>
        </View>

        {/* Social Impact Certificate Trigger (RF-25) */}
        <Pressable 
          onPress={() => setShowCertificate(!showCertificate)} 
          style={styles.certificateTrigger}
        >
          <SymbolView name="doc.text.fill" size={20} tintColor="#ffffff" />
          <ThemedText type="smallBold" style={{ color: '#ffffff', marginLeft: Spacing.two }}>
            {showCertificate ? 'Ocultar Relatório de Impacto Social' : 'Visualizar Relatório de Impacto Social'}
          </ThemedText>
          <SymbolView name={showCertificate ? "chevron.up" : "chevron.down"} size={16} tintColor="#ffffff" />
        </Pressable>

        {/* Dynamic Social Impact Certificate Mockup (RF-25) */}
        {showCertificate && (
          <ThemedView type="backgroundElement" style={styles.certificateCard}>
            <View style={styles.certHeader}>
              <SymbolView name="medal.fill" size={32} tintColor="#ffa726" />
              <ThemedText type="smallBold" style={styles.certTitle}>Selo de Responsabilidade Social</ThemedText>
              <ThemedText type="code" style={styles.certSerial}>#AEP-{activeDonorId.toUpperCase()}</ThemedText>
            </View>
            
            <View style={styles.certDivider} />

            <ThemedText type="small" style={styles.certBody}>
              Certificamos que a empresa <ThemedText type="smallBold">{activeDonorName}</ThemedText> evitou o desperdício de alimentos através do sistema preditivo AlimentAÇÃO.
            </ThemedText>

            <View style={styles.certStatsGrid}>
              <View style={styles.certStatCol}>
                <ThemedText type="subtitle" style={{ color: '#2e7d32', fontSize: 24 }}>{totalWeightKg} kg</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10 }}>Resíduos Evitados</ThemedText>
              </View>
              <View style={styles.certStatCol}>
                <ThemedText type="subtitle" style={{ color: '#2196f3', fontSize: 24 }}>{Math.round(totalWeightKg * 2.2)}</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10 }}>Refeições Entregues</ThemedText>
              </View>
              <View style={styles.certStatCol}>
                <ThemedText type="subtitle" style={{ color: '#e91e63', fontSize: 24 }}>{Math.round(totalWeightKg * 1.9)} kg</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10 }}>CO2 Reduzido</ThemedText>
              </View>
            </View>

            <View style={styles.certFooter}>
              <ThemedText type="code" style={{ fontSize: 9, textAlign: 'center', opacity: 0.7 }}>
                Gerado em {new Date().toLocaleDateString('pt-BR')} • Sistema AlimentAÇÃO Preditiva
              </ThemedText>
            </View>
          </ThemedView>
        )}

        {/* 3-STEP DONATION REGISTRATION (RNF-10, RF-05, RF-06, RF-07, RF-08, RF-09) */}
        <ThemedView type="backgroundElement" style={styles.formContainer}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>CADASTRAR NOVA DOAÇÃO</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Formulário em 3 Etapas Rápidas (Limite RNF-10)
              </ThemedText>
            </View>
            {/* Step badges indicator */}
            <View style={styles.stepBadges}>
              <View style={[styles.stepBadge, formStep >= 1 && styles.stepBadgeActive]}><ThemedText style={styles.stepBadgeText}>1</ThemedText></View>
              <View style={styles.stepLine} />
              <View style={[styles.stepBadge, formStep >= 2 && styles.stepBadgeActive]}><ThemedText style={styles.stepBadgeText}>2</ThemedText></View>
              <View style={styles.stepLine} />
              <View style={[styles.stepBadge, formStep >= 3 && styles.stepBadgeActive]}><ThemedText style={styles.stepBadgeText}>3</ThemedText></View>
            </View>
          </View>

          {/* Feedback banners */}
          {errorMsg !== '' && (
            <View style={styles.errorBanner}><ThemedText type="small" style={{ color: '#ffffff' }}>{errorMsg}</ThemedText></View>
          )}
          {successMsg !== '' && (
            <View style={styles.successBanner}><ThemedText type="small" style={{ color: '#ffffff' }}>{successMsg}</ThemedText></View>
          )}

          {/* FORM - STEP 1: Basic details */}
          {formStep === 1 && (
            <View style={styles.stepWrapper}>
              <ThemedText type="smallBold" style={styles.inputLabel}>Nome do Alimento / Produto</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: Tomate italiano maduro, pão francês, leite desnatado"
                placeholderTextColor={theme.textSecondary}
                value={foodName}
                onChangeText={setFoodName}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Tipo de Alimento</ThemedText>
              <View style={styles.pickerRow}>
                {['Fruta/Legume', 'Laticínio', 'Panificação', 'Carne/Proteína', 'Outros'].map(type => (
                  <Pressable 
                    key={type}
                    style={[styles.pickerCell, foodType === type && styles.pickerCellSelected, { borderColor: theme.backgroundSelected }]}
                    onPress={() => setFoodType(type)}
                  >
                    <ThemedText type="code" style={[styles.pickerCellText, foodType === type && { color: '#ffffff' }]}>
                      {type}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="smallBold" style={styles.inputLabel}>Categoria de Conservação</ThemedText>
              <View style={styles.toggleRow}>
                <Pressable 
                  style={[styles.toggleBtn, category === 'Perecível' && styles.toggleBtnSelected, { borderColor: theme.backgroundSelected }]}
                  onPress={() => setCategory('Perecível')}
                >
                  <ThemedText type="small" style={[styles.toggleBtnText, category === 'Perecível' && { color: '#ffffff' }]}>
                    Perecível (Exige urgência)
                  </ThemedText>
                </Pressable>
                <Pressable 
                  style={[styles.toggleBtn, category === 'Não Perecível' && styles.toggleBtnSelected, { borderColor: theme.backgroundSelected }]}
                  onPress={() => setCategory('Não Perecível')}
                >
                  <ThemedText type="small" style={[styles.toggleBtnText, category === 'Não Perecível' && { color: '#ffffff' }]}>
                    Não Perecível
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText type="smallBold" style={styles.inputLabel}>Quantidade / Peso Estimado</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: 25 kg, 30 unidades, 15 litros"
                placeholderTextColor={theme.textSecondary}
                value={quantity}
                onChangeText={setQuantity}
              />

              <Pressable style={styles.formNavBtn} onPress={handleNextStep1}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Avançar para Etapa 2</ThemedText>
                <SymbolView name="arrow.right" size={16} tintColor="#ffffff" />
              </Pressable>
            </View>
          )}

          {/* FORM - STEP 2: Expiry & real camera capture */}
          {formStep === 2 && (
            <View style={styles.stepWrapper}>
              <ThemedText type="smallBold" style={styles.inputLabel}>Data de Validade (Validado se Futura - RF-08)</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={theme.textSecondary}
                value={expiryDate}
                onChangeText={setExpiryDate}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Condições Especiais de Armazenamento</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: Necessita refrigeração, manter em local seco"
                placeholderTextColor={theme.textSecondary}
                value={storageConditions}
                onChangeText={setStorageConditions}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Foto do Alimento (Captura por Câmera / Galeria - RF-07)</ThemedText>
              <ThemedView type="backgroundSelected" style={styles.cameraSimulatorBox}>
                <View style={styles.inactiveCameraContent}>
                  <View style={styles.photoPreviewBadge}>
                    {photoAsset?.uri ? (
                      <Image source={{ uri: photoAsset.uri }} style={styles.photoPreviewImage} resizeMode="cover" />
                    ) : (
                      <>
                        <SymbolView name="camera.fill" size={28} tintColor="#3c87f7" />
                        <ThemedText type="code" style={styles.emptyPhotoText}>Sem foto</ThemedText>
                      </>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.three }}>
                    <ThemedText type="smallBold">
                      {photoAsset ? 'Foto real capturada' : 'Nenhuma foto capturada'}
                    </ThemedText>
                    <ThemedText type="code" style={{ fontSize: 11, opacity: 0.7 }}>
                      Use a câmera do dispositivo ou escolha uma imagem da galeria.
                    </ThemedText>
                    <View style={styles.cameraActionsRow}>
                      <Pressable style={styles.cameraBtn} onPress={capturePhoto} disabled={loadingPhoto}>
                        {loadingPhoto ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <SymbolView name="camera.fill" size={16} tintColor="#ffffff" />
                        )}
                        <ThemedText type="code" style={styles.cameraBtnText}>Abrir Câmera</ThemedText>
                      </Pressable>
                      <Pressable style={styles.galleryBtn} onPress={pickPhotoFromLibrary} disabled={loadingPhoto}>
                        <SymbolView name="photo.fill" size={16} tintColor="#3c87f7" />
                        <ThemedText type="code" style={styles.galleryBtnText}>Galeria</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ThemedView>

              <View style={styles.formNavRow}>
                <Pressable style={[styles.formNavBtn, styles.backBtn]} onPress={handlePrevStep}>
                  <SymbolView name="arrow.left" size={16} tintColor="#3c87f7" />
                  <ThemedText type="smallBold" style={{ color: '#3c87f7', marginLeft: Spacing.one }}>Voltar</ThemedText>
                </Pressable>
                
                <Pressable style={[styles.formNavBtn, { flex: 2 }]} onPress={handleNextStep2}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Avançar para Etapa 3</ThemedText>
                  <SymbolView name="arrow.right" size={16} tintColor="#ffffff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* FORM - STEP 3: GPS capture and Predictive suggestions preview */}
          {formStep === 3 && (
            <View style={styles.stepWrapper}>
              <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>Revisão e Captura de Metadados</ThemedText>

              {/* GPS Auto capture showcase (RF-06) */}
              <ThemedView type="backgroundSelected" style={styles.gpsDisplayBox}>
                <SymbolView name="location.fill" size={24} tintColor="#4caf50" />
                <View style={{ flex: 1, marginLeft: Spacing.two }}>
                  <ThemedText type="smallBold">Localização GPS Automática (RF-06)</ThemedText>
                  <ThemedText type="code" style={{ fontSize: 11 }}>
                    Lat: -23.5615 • Lng: -46.6560 (São Paulo - SP)
                  </ThemedText>
                  <ThemedText type="code" style={{ fontSize: 9, opacity: 0.6 }}>
                    Capturado no instante do cadastro da doação.
                  </ThemedText>
                </View>
                <View style={styles.gpsStatusBadge}>
                  <ThemedText type="code" style={{ color: '#ffffff', fontSize: 10 }}>OK (Sinal 100%)</ThemedText>
                </View>
              </ThemedView>

              {/* Predicted Urgency Simulation Preview (RF-10, RF-12) */}
              <ThemedView type="backgroundSelected" style={styles.modelPreviewCard}>
                <View style={styles.modelHeader}>
                  <SymbolView name="brain.head.profile" size={20} tintColor="#9c27b0" />
                  <ThemedText type="code" style={{ marginLeft: Spacing.one, color: '#9c27b0', fontWeight: 'bold' }}>
                    Motor Preditivo: Inteligência de Urgência
                  </ThemedText>
                </View>
                <View style={{ marginTop: Spacing.one }}>
                  <ThemedText type="small">
                    Com base no tipo <ThemedText type="smallBold">&quot;{foodType}&quot;</ThemedText> e validade em <ThemedText type="smallBold">{expiryDate}</ThemedText>, o modelo de Random Forest calculou:
                  </ThemedText>
                  
                  <View style={styles.modelResultRow}>
                    <View style={styles.urgencyPill}>
                      <ThemedText type="code" style={{ color: '#ffffff' }}>Urgência: ALTA (90/100)</ThemedText>
                    </View>
                    <ThemedText type="code" style={{ fontSize: 11, flex: 1, marginLeft: Spacing.two }}>
                      Recomendado para coleta imediata em até 48 horas.
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              {/* Matching Suggested NGO Preview (RF-17) */}
              <ThemedView type="backgroundSelected" style={styles.modelPreviewCard}>
                <View style={styles.modelHeader}>
                  <SymbolView name="arrow.triangle.merge" size={20} tintColor="#ff9800" />
                  <ThemedText type="code" style={{ marginLeft: Spacing.one, color: '#ff9800', fontWeight: 'bold' }}>
                    Motor de Matching: Melhor Destino Sugerido
                  </ThemedText>
                </View>
                <View style={{ marginTop: Spacing.one }}>
                  <ThemedText type="small">
                    Combinando distância, capacidade de atendimento e a demanda futura estimada da ONG (AutoETS/AutoARIMA):
                  </ThemedText>
                  <View style={styles.ngoSuggestionBox}>
                    <SymbolView name="hands.sparkles.fill" size={22} tintColor="#ff9800" />
                    <View style={{ flex: 1, marginLeft: Spacing.two }}>
                      <ThemedText type="smallBold">ONG Prato Cheio</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10 }}>Score: 88.5/100 • Distância: 1.2 km</ThemedText>
                    </View>
                    <View style={styles.matchScoreBadge}>
                      <ThemedText type="code" style={{ color: '#ffffff', fontSize: 10 }}>RECOMENDADA</ThemedText>
                    </View>
                  </View>
                </View>
              </ThemedView>

              <View style={styles.formNavRow}>
                <Pressable style={[styles.formNavBtn, styles.backBtn]} onPress={handlePrevStep}>
                  <SymbolView name="arrow.left" size={16} tintColor="#3c87f7" />
                  <ThemedText type="smallBold" style={{ color: '#3c87f7', marginLeft: Spacing.one }}>Voltar</ThemedText>
                </Pressable>
                
                <Pressable 
                  style={[styles.formNavBtn, { flex: 2, backgroundColor: '#4caf50' }]} 
                  onPress={handleRegisterDonation}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Confirmar e Publicar</ThemedText>
                      <SymbolView name="checkmark" size={16} tintColor="#ffffff" />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

        </ThemedView>

        {/* DONATIONS REGISTRY LIST */}
        <ThemedView type="backgroundElement" style={styles.listContainer}>
          <ThemedText type="smallBold" style={styles.listTitle}>Minhas Doações Registradas</ThemedText>
          {donorDonations.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.four }}>
              Nenhuma doação cadastrada por você ainda.
            </ThemedText>
          ) : (
            <View style={styles.donationList}>
              {donorDonations.map(donation => {
                const photo = getDonationPhoto(donation);
                return (
                  <ThemedView key={donation.id} type="backgroundSelected" style={styles.donationCard}>
                    <View style={[styles.donationPhotoSide, { backgroundColor: photo.preset.color + '15' }]}>
                      {photo.uri ? (
                        <Image source={{ uri: photo.uri }} style={styles.donationPhotoImage} resizeMode="cover" />
                      ) : (
                        <ThemedText style={{ fontSize: 32 }}>{photo.preset.emoji}</ThemedText>
                      )}
                    </View>
                    <View style={styles.donationDetailsSide}>
                      <View style={styles.donationCardHeader}>
                        <ThemedText type="smallBold" style={{ flex: 1 }}>{donation.name}</ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(donation.status) }]}>
                          <ThemedText type="code" style={styles.statusBadgeText}>{donation.status}</ThemedText>
                        </View>
                      </View>
                      
                      <ThemedText type="code" style={styles.donationCardDesc}>
                        Qtd: {donation.quantity} • Validade: {donation.expiryDate}
                      </ThemedText>

                      {donation.matchedNgoName && (
                        <View style={styles.matchedNgoRow}>
                          <SymbolView name="hands.sparkles.fill" size={12} tintColor="#ff9800" />
                          <ThemedText type="code" style={styles.matchedNgoText}>
                            Destinado para: {donation.matchedNgoName} (Score: {donation.matchScore})
                          </ThemedText>
                        </View>
                      )}

                      <ThemedText type="code" style={styles.donationTimeText}>
                        Cadastrado em {new Date(donation.timestamp).toLocaleDateString('pt-BR')} às {new Date(donation.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </ThemedText>
                    </View>
                  </ThemedView>
                );
              })}
            </View>
          )}
        </ThemedView>

        {/* NOTIFICATIONS INBOX */}
        <ThemedView type="backgroundElement" style={styles.notificationsContainer}>
          <View style={styles.notifHeader}>
            <SymbolView name="bell.fill" size={18} tintColor="#3c87f7" />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Avisos e Notificações ({donorNotifications.filter(n => !n.read).length})</ThemedText>
          </View>
          
          {donorNotifications.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.three }}>
              Nenhum alerta ativo.
            </ThemedText>
          ) : (
            <View style={styles.notifList}>
              {donorNotifications.map(notif => (
                <Pressable 
                  key={notif.id} 
                  onPress={() => store.markNotificationRead(notif.id)}
                  style={[styles.notifCard, !notif.read && styles.notifUnread, { borderBottomColor: theme.backgroundSelected }]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={!notif.read ? { color: '#3c87f7' } : undefined}>{notif.title}</ThemedText>
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
  certificateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3c87f7',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    justifyContent: 'space-between',
  },
  certificateCard: {
    borderWidth: 2,
    borderColor: '#ffa72644',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    backgroundColor: '#fffcf5',
    elevation: 2,
  },
  certHeader: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  certTitle: {
    fontSize: 16,
    color: '#e65100',
    textAlign: 'center',
  },
  certSerial: {
    fontSize: 9,
    opacity: 0.6,
  },
  certDivider: {
    height: 1,
    backgroundColor: '#ffa72633',
    marginVertical: Spacing.three,
  },
  certBody: {
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.two,
  },
  certStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  certStatCol: {
    alignItems: 'center',
  },
  certFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ffa72622',
    paddingTop: Spacing.two,
    marginTop: Spacing.two,
  },
  formContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    paddingBottom: Spacing.two,
    marginBottom: Spacing.three,
  },
  stepBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#3c87f7',
  },
  stepBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 15,
    height: 2,
    backgroundColor: 'rgba(150,150,150,0.2)',
  },
  stepWrapper: {
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 13,
    marginTop: Spacing.one,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  pickerCell: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  pickerCellSelected: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  pickerCellText: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  toggleBtnSelected: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  toggleBtnText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  formNavBtn: {
    height: 50,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  formNavRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  backBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3c87f7',
  },
  cameraSimulatorBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3c87f788',
    minHeight: 120,
    justifyContent: 'center',
  },
  inactiveCameraContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoPreviewBadge: {
    width: 70,
    height: 70,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 135, 247, 0.12)',
    overflow: 'hidden',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  emptyPhotoText: {
    marginTop: 4,
    color: '#3c87f7',
    fontSize: 10,
  },
  cameraActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignSelf: 'flex-start',
  },
  cameraBtnText: {
    color: '#ffffff',
    marginLeft: Spacing.one,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignSelf: 'flex-start',
  },
  galleryBtnText: {
    color: '#3c87f7',
    marginLeft: Spacing.one,
  },
  gpsDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#4caf5055',
  },
  gpsStatusBadge: {
    backgroundColor: '#4caf50',
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  modelPreviewCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: '#9c27b0',
    marginTop: Spacing.two,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  urgencyPill: {
    backgroundColor: '#f44336',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  ngoSuggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
    borderWidth: 1,
    borderColor: '#ff980044',
  },
  matchScoreBadge: {
    backgroundColor: '#ff9800',
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
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
  listContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 2,
  },
  listTitle: {
    marginBottom: Spacing.three,
  },
  donationList: {
    gap: Spacing.three,
  },
  donationCard: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  donationPhotoSide: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationPhotoImage: {
    width: '100%',
    height: '100%',
  },
  donationDetailsSide: {
    flex: 1,
    padding: Spacing.three,
    gap: 4,
  },
  donationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  donationCardDesc: {
    fontSize: 12,
    opacity: 0.8,
  },
  matchedNgoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  matchedNgoText: {
    fontSize: 10,
    color: '#ff9800',
  },
  donationTimeText: {
    fontSize: 9,
    opacity: 0.5,
    marginTop: 4,
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
    backgroundColor: '#3c87f70b',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3c87f7',
    marginLeft: Spacing.two,
  },
});
