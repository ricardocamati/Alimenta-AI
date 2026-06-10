import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  View,
  Image,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { formatDateInput, parseBRDate, toDisplayDate } from '@/utils/dateMask';
import { useDoacao } from '@/hooks/useDoacao';
import api from '@/services/api';
import { useDashboard } from '@/hooks/useDashboard';
import { useNotifications } from '@/hooks/useNotifications';
import { UrgencyBadge } from '@/components/urgency-badge';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import type { DoacaoDTO } from '@/types';

// Preset metadata used for seeded donations and fallback cards.
const FOOD_PHOTOS = [
  { id: 'tomatoes', name: 'Tomates', emoji: '🍅', color: '#ff5252', url: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=120' },
  { id: 'bread', name: 'Pão Caseiro', emoji: '🍞', color: '#ffa726', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120' },
  { id: 'oranges', name: 'Laranjas', emoji: '🍊', color: '#ffb74d', url: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=120' },
  { id: 'milk', name: 'Leite Longa Vida', emoji: '🥛', color: '#e0e0e0', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120' },
  { id: 'vegetables', name: 'Cesta de Verduras', emoji: '🥬', color: '#81c784', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=120' },
  { id: 'meats', name: 'Carne Bovina', emoji: '🥩', color: '#e57373', url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=120' },
  { id: 'banana', name: 'Banana', emoji: '🍌', color: '#ffe135', url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=120' },
  { id: 'rice', name: 'Arroz', emoji: '🍚', color: '#f5f5f5', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=120' },
  { id: 'pasta', name: 'Macarrão', emoji: '🍝', color: '#ffab91', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=120' },
  { id: 'fruit', name: 'Fruta', emoji: '🍎', color: '#ff5252', url: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=120' },
  { id: 'grain', name: 'Grãos', emoji: '🌾', color: '#d7ccc8', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=120' },
  { id: 'oil', name: 'Óleo', emoji: '🫒', color: '#c5e1a5', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120' },
];

export default function DonorScreen() {
  const { user, logout } = useAuth();
  const { doacoes, isLoading: loadingDoacoes, error: doacaoError, createDoacao, refresh: refreshDoacoes } = useDoacao();
  const { data: dashData, isLoading: loadingDash, error: dashError, refresh: refreshDash } = useDashboard();
  const { notifs: donorNotifications, markRead: markDonorNotifRead } = useNotifications({ autoRefresh: true, intervalMs: 30000 });
  const theme = useTheme();

  const isDonorLoggedIn = !!(user && (user.tipo === 'doador' || user?.is_test_mode));
  const activeDonorId = isDonorLoggedIn ? String(user!.id) : '';
  const activeDonorName = isDonorLoggedIn ? user!.nome : (user?.nome || 'Visitante');

  const dash = dashData && 'perfil' in dashData && dashData.perfil === 'doador' ? dashData : null;
  const minhasDoacoes = doacoes.filter(d => d.doador_id === user?.id);
  const totalDonationsCount = dash?.total_doacoes || minhasDoacoes.length;
  const totalWeightKg = minhasDoacoes
    .filter(d => ['confirmado', 'coletado', 'notificado', 'matched'].includes(d.status))
    .reduce((acc, d) => acc + d.quantidade, 0);
  const pendingDonationsCount = minhasDoacoes.filter(d =>
    ['cadastrado', 'analisado', 'matched', 'notificado'].includes(d.status)
  ).length;

  // --- 3-STEP DONATION FORM STATES ---
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  
  // Step 1 States
  const [foodName, setFoodName] = useState('');
  const [foodType, setFoodType] = useState('Fruta/Legume'); // e.g. Laticínio, Carne, Panificação
  const [category, setCategory] = useState<'Perecível' | 'Não Perecível'>('Perecível');
  const [quantity, setQuantity] = useState('');

  // Step 2 States
  const [expiryDateRaw, setExpiryDateRaw] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  });
  const [expiryDateDisplay, setExpiryDateDisplay] = useState(() => toDisplayDate(expiryDateRaw));
  const [storageConditions, setStorageConditions] = useState('Temperatura Ambiente');
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('Localização ainda não capturada');
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Form Submission feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- OTHER STATES ---

  // Filter notifications for this specific donor (ja vem filtrado do backend pelo user_id)
  const hasLocation = latitude !== null && longitude !== null;

  const uploadFoto = async (photoAsset: ImagePicker.ImagePickerAsset): Promise<string> => {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      // Web: fetch(uri).blob() necessário para criar File real
      const blob = await (await fetch(photoAsset.uri)).blob();
      formData.append('file', blob, 'photo.jpg');
    } else {
      // Mobile: React Native usa objeto {uri, type, name}
      formData.append('file', {
        uri: photoAsset.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
    }
    const response = await api.post('/doacoes/upload-foto', formData);
    return response.url;
  };

  const handleNextStep1 = () => {
    if (!foodName || !quantity) {
      setErrorMsg('Preencha o nome do alimento e a quantidade.');
      return;
    }
    setErrorMsg('');
    setFormStep(2);
  };

  const handleNextStep2 = async () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const isoDate = parseBRDate(expiryDateDisplay);
    if (!isoDate) {
      setErrorMsg('Digite a data no formato DD/MM/AAAA.');
      return;
    }
    const expiry = new Date(isoDate);

    if (expiry <= today) {
      setErrorMsg('A data de validade deve ser uma data futura.');
      return;
    }
    if (!photoAsset) {
      setErrorMsg('Capture ou selecione uma foto real do alimento antes de avançar.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const url = await uploadFoto(photoAsset);
      setFotoUrl(url);
      setLoading(false);
      setFormStep(3);
    } catch (err: any) {
      console.error('Erro upload foto:', err?.message || err);
      setLoading(false);
      setErrorMsg('Erro ao fazer upload da foto. Tente novamente.');
    }
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
        mediaTypes: ImagePicker.MediaType.Images,
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
    if (Platform.OS === 'web') {
      // Fallback nativo HTML file picker para web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const uri = URL.createObjectURL(file);
        setPhotoAsset({ uri, width: 0, height: 0, type: 'image' } as any);
      };
      input.click();
      return;
    }

    try {
      setLoadingPhoto(true);
      setErrorMsg('');

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Permissão de galeria negada. Habilite o acesso às fotos para continuar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
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

  const captureLocation = async () => {
    try {
      setLoadingLocation(true);
      setErrorMsg('');

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Permissão de localização negada. Habilite o GPS para continuar.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude: lat, longitude: lng } = position.coords;
      setLatitude(lat);
      setLongitude(lng);

      try {
        const [resolved] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (resolved) {
          const city = resolved.city || resolved.subregion || resolved.region || 'Localidade';
          const region = resolved.region || '';
          const street = resolved.street || resolved.name || '';
          setLocationLabel([street, city, region].filter(Boolean).join(' • '));
        } else {
          setLocationLabel('Localização capturada com sucesso');
        }
      } catch {
        setLocationLabel('Localização capturada com sucesso');
      }
    } catch {
      Alert.alert('Erro de localização', 'Não foi possível obter sua localização atual.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleRegisterDonation = async () => {
    if (!fotoUrl) {
      setErrorMsg('Capture ou selecione uma foto real do alimento antes de publicar.');
      return;
    }

    const capturedLatitude = latitude;
    const capturedLongitude = longitude;

    if (capturedLatitude === null || capturedLongitude === null) {
      setErrorMsg('Capture a localização real do usuário antes de publicar.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await createDoacao({
        tipo_alimento: foodName,
        categoria: category === 'Perecível' ? 'perecivel_alto' : 'perecivel_baixo',
        quantidade: parseFloat(quantity) || 0,
        data_validade: parseBRDate(expiryDateDisplay) || expiryDateRaw,
        foto_url: fotoUrl || '',
        latitude: capturedLatitude,
        longitude: capturedLongitude,
      });
      
      setLoading(false);
      setSuccessMsg(`Doação "${foodName}" cadastrada com sucesso!`);
      
      setFoodName('');
      setFoodType('Fruta/Legume');
      setCategory('Perecível');
      setQuantity('');
      setStorageConditions('Temperatura Ambiente');
      const tomorrowReset = new Date();
      tomorrowReset.setDate(tomorrowReset.getDate() + 2);
      setExpiryDateRaw(tomorrowReset.toISOString().split('T')[0]);
      setExpiryDateDisplay(toDisplayDate(tomorrowReset.toISOString().split('T')[0]));
      setPhotoAsset(null);
      setFotoUrl(null);
      setLatitude(null);
      setLongitude(null);
      setLocationLabel('Localização ainda não capturada');
      setFormStep(1);
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Erro ao registrar doação.');
    }
  };

  const getDonationPhoto = (donation: DoacaoDTO) => {
    const photoValue = donation.foto_url;
    // Infer photo preset from food type / name using comprehensive keyword matching
    const tipo = (donation.tipo_alimento || '').toLowerCase();
    let photoId = 'vegetables'; // default fallback
    if (tipo.includes('carne') || tipo.includes('frango') || tipo.includes('peixe') || tipo.includes('proteína') || tipo.includes('bovina') || tipo.includes('suína')) {
      photoId = 'meats';
    } else if (tipo.includes('banana') || tipo.includes('bananas')) {
      photoId = 'banana';
    } else if (tipo.includes('arroz') || tipo.includes('rice')) {
      photoId = 'rice';
    } else if (tipo.includes('macarrão') || tipo.includes('macarrao') || tipo.includes('pasta') || tipo.includes('espaguete') || tipo.includes('noodle')) {
      photoId = 'pasta';
    } else if (tipo.includes('pão') || tipo.includes('padaria') || tipo.includes('bolo') || tipo.includes('croissant')) {
      photoId = 'bread';
    } else if (tipo.includes('leite') || tipo.includes('laticínio') || tipo.includes('queijo') || tipo.includes('iogurte') || tipo.includes('manteiga')) {
      photoId = 'milk';
    } else if (tipo.includes('tomate') || tipo.includes('tomates')) {
      photoId = 'tomatoes';
    } else if (tipo.includes('laranja') || tipo.includes('cítrico') || tipo.includes('limão') || tipo.includes('tangerina')) {
      photoId = 'oranges';
    } else if (tipo.includes('óleo') || tipo.includes('azeite') || tipo.includes('óleo vegetal')) {
      photoId = 'oil';
    } else if (tipo.includes('grão') || tipo.includes('feijão') || tipo.includes('lentilha') || tipo.includes('ervilha') || tipo.includes('soja')) {
      photoId = 'grain';
    } else if (tipo.includes('fruta') || tipo.includes('maçã') || tipo.includes('pera') || tipo.includes('uva') || tipo.includes('morango') || tipo.includes('melancia')) {
      photoId = 'fruit';
    } else if (tipo.includes('verdura') || tipo.includes('legume') || tipo.includes('vegetal') || tipo.includes('alface') || tipo.includes('couve') || tipo.includes('cenoura') || tipo.includes('batata')) {
      photoId = 'vegetables';
    }
    const preset = FOOD_PHOTOS.find(p => p.id === photoId);
    return { preset: preset || FOOD_PHOTOS[4], uri: photoValue || null };
  };

  useEffect(() => {
    refreshDoacoes();
    refreshDash();
  }, []);

  // Helper for status styling
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'cadastrado': return '#2196f3';
      case 'analisado': return '#9c27b0';
      case 'matched': return '#ff9800';
      case 'notificado': return '#e91e63';
      case 'coletado': return '#4caf50';
      case 'confirmado': return '#2e7d32';
      case 'cancelado': return '#f44336';
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
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <ThemedText type="small" style={{ color: '#e91e63' }}>Sair</ThemedText>
          </Pressable>
        </ThemedView>

        {/* Dashboard Metrics */}
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

        {/* 3-STEP DONATION REGISTRATION */}
        <ThemedView type="backgroundElement" style={styles.formContainer}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>CADASTRAR NOVA DOAÇÃO</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Formulário em 3 Etapas Rápidas
              </ThemedText>
            </View>
            {/* Step badges indicator */}
            <View style={styles.stepBadges}>
              <View style={styles.stepItem}>
                <View style={[styles.stepBadge, formStep >= 1 && styles.stepBadgeActive]}><ThemedText style={styles.stepBadgeText}>1</ThemedText></View>
                <ThemedText type="code" style={styles.stepLabel}>Produto</ThemedText>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={[styles.stepBadge, formStep >= 2 && styles.stepBadgeActive]}><ThemedText style={styles.stepBadgeText}>2</ThemedText></View>
                <ThemedText type="code" style={styles.stepLabel}>Validade</ThemedText>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={[styles.stepBadge, formStep >= 3 && styles.stepBadgeActive]}><ThemedText style={styles.stepBadgeText}>3</ThemedText></View>
                <ThemedText type="code" style={styles.stepLabel}>Revisão</ThemedText>
              </View>
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
                    <ThemedText type="small" style={[styles.pickerCellText, foodType === type && { color: '#ffffff' }]}>
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
              <ThemedText type="smallBold" style={styles.inputLabel}>Data de Validade</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={theme.textSecondary}
                value={expiryDateDisplay}
                onChangeText={(t) => setExpiryDateDisplay(formatDateInput(t))}
                maxLength={10}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Condições Especiais de Armazenamento</ThemedText>
              <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                placeholder="Ex: Necessita refrigeração, manter em local seco"
                placeholderTextColor={theme.textSecondary}
                value={storageConditions}
                onChangeText={setStorageConditions}
              />

              <ThemedText type="smallBold" style={styles.inputLabel}>Foto do Alimento (Captura por Câmera / Galeria)</ThemedText>
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

              <ThemedView type="backgroundSelected" style={styles.gpsDisplayBox}>
                <View style={styles.gpsHeaderRow}>
                  <SymbolView name="location.fill" size={24} tintColor="#4caf50" />
                  <View style={{ flex: 1, marginLeft: Spacing.two }}>
                    <ThemedText type="smallBold">Localização GPS do usuário</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 9, opacity: 0.6 }}>
                      A latitude e longitude salvas serão as coordenadas atuais do dispositivo.
                    </ThemedText>
                  </View>
                  <View style={[styles.gpsStatusBadge, !hasLocation && styles.gpsStatusPending]}>
                    <ThemedText type="code" style={{ color: '#ffffff', fontSize: 10 }}>
                      {hasLocation ? 'GPS OK' : 'PENDENTE'}
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  style={styles.locationCaptureBtn}
                  onPress={captureLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <SymbolView name="location.fill" size={16} tintColor="#ffffff" />
                  )}
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    {hasLocation ? 'Atualizar localização' : 'Capturar localização atual'}
                  </ThemedText>
                </Pressable>

                <View style={styles.locationResultBox}>
                  <ThemedText type="smallBold">{locationLabel}</ThemedText>
                  <ThemedText type="code" style={styles.locationCoordsText}>
                    {hasLocation
                      ? `Lat: ${latitude?.toFixed(5)} • Lng: ${longitude?.toFixed(5)}`
                      : 'Nenhuma coordenada capturada ainda.'}
                  </ThemedText>
                </View>
              </ThemedView>

              {/* Predicted Urgency Simulation Preview */}
              <ThemedView type="backgroundSelected" style={styles.modelPreviewCard}>
                <View style={styles.modelHeader}>
                  <SymbolView name="brain.head.profile" size={20} tintColor="#9c27b0" />
                  <ThemedText type="code" style={{ marginLeft: Spacing.one, color: '#9c27b0', fontWeight: 'bold' }}>
                    Motor Preditivo: Inteligência de Urgência
                  </ThemedText>
                </View>
                <View style={{ marginTop: Spacing.one }}>
                  <ThemedText type="small">
                    Com base no tipo <ThemedText type="smallBold">&quot;{foodType}&quot;</ThemedText> e validade em <ThemedText type="smallBold">{expiryDateDisplay}</ThemedText>, o modelo de Random Forest calculou:
                  </ThemedText>
                  
                  <View style={styles.modelResultRow}>
                    <UrgencyBadge urgency="alta" />
                    <ThemedText type="code" style={{ fontSize: 11, flex: 1, marginLeft: Spacing.two }}>
                      Recomendado para coleta imediata em até 48 horas.
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              {/* Matching Suggested NGO Preview */}
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
                      <ThemedText type="smallBold">{'Melhor ONG disponível'}</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10 }}>
                        {'Score: 0/100 • Distância: Calculando...'}
                      </ThemedText>
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
        {loadingDoacoes ? (
          <LoadingSpinner message="Carregando doações..." />
        ) : doacaoError ? (
          <ErrorMessage message={doacaoError} onRetry={() => { refreshDoacoes(); refreshDash(); }} />
        ) : (
          <>
        <ThemedView type="backgroundElement" style={styles.listContainer}>
          <ThemedText type="smallBold" style={styles.listTitle}>Minhas Doações Registradas</ThemedText>
          {doacoes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.four }}>
              Nenhuma doação cadastrada por você ainda.
            </ThemedText>
          ) : (
            <View style={styles.donationList}>
              {minhasDoacoes.map(donation => {
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
                        <ThemedText type="smallBold" style={{ flex: 1 }}>{donation.tipo_alimento}</ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(donation.status) }]}>
                          <ThemedText type="code" style={styles.statusBadgeText}>{donation.status}</ThemedText>
                        </View>
                      </View>
                      
                      <ThemedText type="code" style={styles.donationCardDesc}>
                        Qtd: {donation.quantidade} • Validade: {toDisplayDate(donation.data_validade)}
                      </ThemedText>

                      <View style={styles.donationUrgencyRow}>
                        <UrgencyBadge urgency={donation.urgencia || 'media'} compact />
                      </View>

                      {donation.score_matching != null && (
                        <View style={styles.matchedNgoRow}>
                          <SymbolView name="hands.sparkles.fill" size={12} tintColor="#ff9800" />
                          <ThemedText type="code" style={styles.matchedNgoText}>
                            Score: {Math.round(donation.score_matching)}/100
                            {donation.distancia_km != null ? ` • ${donation.distancia_km.toFixed(1)} km` : ''}
                          </ThemedText>
                        </View>
                      )}

                      <ThemedText type="code" style={styles.donationTimeText}>
                        Cadastrado em {new Date(donation.criado_em).toLocaleDateString('pt-BR')} às {new Date(donation.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </ThemedText>

                      {/* Status simples: Cadastrado → Correspondente */}
                      <View style={{ marginTop: Spacing.one, paddingLeft: Spacing.one }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50', marginRight: Spacing.one }} />
                          <ThemedText type="code" style={{ fontSize: 10 }}>
                            {donation.status === 'cadastrado' ? 'Cadastrado' : 'Correspondente'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </ThemedView>
                );
              })}
            </View>
          )}
        </ThemedView>
          </>
        )}

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
                  onPress={() => markDonorNotifRead(notif.id)}
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
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e91e6344' },
  kpiContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
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
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 2,
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
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#4caf5055',
    gap: Spacing.two,
  },
  gpsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsStatusBadge: {
    backgroundColor: '#4caf50',
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  gpsStatusPending: {
    backgroundColor: '#ff9800',
  },
  locationCaptureBtn: {
    minHeight: 46,
    borderRadius: Spacing.two,
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  locationResultBox: {
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: Spacing.two,
  },
  locationCoordsText: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.75,
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
  donationUrgencyRow: {
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
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
