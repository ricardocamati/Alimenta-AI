import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';

const FOOD_TYPES = ['Fruta/Legume', 'Laticínio', 'Panificação', 'Carne/Proteína', 'Grãos', 'Outros'];

type Step = 1 | 2 | 3;
type Category = 'Perecível' | 'Não Perecível';

function defaultExpiryDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  return tomorrow.toISOString().split('T')[0];
}

export default function ModalScreen() {
  const store = useStore();
  const theme = useTheme();

  const [step, setStep] = useState<Step>(1);
  const [foodName, setFoodName] = useState('');
  const [foodType, setFoodType] = useState(FOOD_TYPES[0]);
  const [category, setCategory] = useState<Category>('Perecível');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('Localização ainda não capturada');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const storageConditions = category === 'Perecível'
    ? 'Refrigerado / armazenar em local fresco'
    : 'Temperatura ambiente / local seco';

  const hasLocation = latitude !== null && longitude !== null;

  function goBack() {
    setErrorMsg('');
    if (step === 1) {
      router.back();
      return;
    }
    setStep((current) => (current - 1) as Step);
  }

  function validateStep1() {
    if (!foodName.trim() || !quantity.trim()) {
      setErrorMsg('Informe o nome do alimento e a quantidade.');
      return;
    }

    setErrorMsg('');
    setStep(2);
  }

  function validateStep2() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);

    if (Number.isNaN(expiry.getTime()) || expiry <= today) {
      setErrorMsg('A data de validade precisa ser futura.');
      return;
    }

    if (!photoAsset) {
      setErrorMsg('Tire uma foto da doação para continuar.');
      return;
    }

    setErrorMsg('');
    setStep(3);
  }

  async function capturePhoto() {
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
  }

  async function captureLocation() {
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
          const parts = [street, city, region].filter(Boolean);
          setLocationLabel(parts.join(' • '));
        } else {
          setLocationLabel('Localização capturada com sucesso');
        }
      } catch {
        setLocationLabel('Localização capturada com sucesso');
      }
    } catch {
      Alert.alert('Erro de localização', 'Não foi possível obter a localidade atual.');
    } finally {
      setLoadingLocation(false);
    }
  }

  function submitDonation() {
    if (!photoAsset) {
      setErrorMsg('Capture uma foto antes de confirmar.');
      return;
    }

    if (!hasLocation) {
      setErrorMsg('Capture sua localização antes de confirmar.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    setTimeout(() => {
      try {
        store.registerDonation({
          name: foodName.trim(),
          type: foodType,
          category,
          quantity: quantity.trim(),
          expiryDate,
          photoUrl: photoAsset.uri,
          storageConditions,
          lat: latitude ?? undefined,
          lng: longitude ?? undefined,
        });

        setSuccessMsg('Doação registrada com sucesso.');
        setSubmitting(false);

        setTimeout(() => {
          router.back();
        }, 800);
      } catch (error: any) {
        setSubmitting(false);
        setErrorMsg(error?.message || 'Não foi possível registrar a doação.');
      }
    }, 700);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <SymbolView name="camera.fill" size={28} tintColor="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={styles.heroTitle}>Nova Doação</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Fluxo com câmera real, validade e localidade do usuário.
            </ThemedText>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <SymbolView name="xmark" size={16} tintColor={theme.text} />
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <ThemedText type="smallBold">Etapa {step} de 3</ThemedText>
            <ThemedText type="code" themeColor="textSecondary">
              {step === 1 ? 'Seleção' : step === 2 ? 'Câmera e validade' : 'GPS e confirmação'}
            </ThemedText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
        </ThemedView>

        {errorMsg !== '' && (
          <ThemedView type="backgroundElement" style={styles.feedbackError}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>{errorMsg}</ThemedText>
          </ThemedView>
        )}

        {successMsg !== '' && (
          <ThemedView type="backgroundElement" style={styles.feedbackSuccess}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>{successMsg}</ThemedText>
          </ThemedView>
        )}

        {step === 1 && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>1. Seleção da doação</ThemedText>

            <ThemedText type="smallBold" style={styles.label}>Nome do alimento</ThemedText>
            <TextInput
              value={foodName}
              onChangeText={setFoodName}
              placeholder="Ex: Tomates maduros, pão integral, leite"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />

            <ThemedText type="smallBold" style={styles.label}>Tipo de alimento</ThemedText>
            <View style={styles.pillsWrap}>
              {FOOD_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFoodType(type)}
                  style={[
                    styles.pill,
                    foodType === type && styles.pillActive,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <ThemedText type="code" style={[styles.pillText, foodType === type && styles.pillTextActive]}>
                    {type}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="smallBold" style={styles.label}>Categoria</ThemedText>
            <View style={styles.segmentRow}>
              {(['Perecível', 'Não Perecível'] as Category[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.segment,
                    category === item && styles.segmentActive,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <ThemedText type="smallBold" style={[styles.segmentText, category === item && styles.segmentTextActive]}>
                    {item}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="smallBold" style={styles.label}>Quantidade</ThemedText>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Ex: 25 kg, 12 unidades"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />

            <Pressable style={styles.primaryButton} onPress={validateStep1}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>Avançar para câmera e validade</ThemedText>
              <SymbolView name="arrow.right" size={16} tintColor="#ffffff" />
            </Pressable>
          </ThemedView>
        )}

        {step === 2 && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>2. Câmera e validade</ThemedText>

            <View style={styles.photoPanel}>
              <View style={styles.photoPreview}>
                {photoAsset?.uri ? (
                  <RNImage source={{ uri: photoAsset.uri }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <SymbolView name="photo.fill" size={28} tintColor="#3c87f7" />
                    <ThemedText type="code" style={{ marginTop: 6, color: '#3c87f7' }}>Sem foto</ThemedText>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">Foto da doação</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Capture a imagem da doação usando a câmera do dispositivo.
                </ThemedText>
                <Pressable style={styles.secondaryButton} onPress={capturePhoto} disabled={loadingPhoto}>
                  {loadingPhoto ? (
                    <ActivityIndicator color="#3c87f7" size="small" />
                  ) : (
                    <>
                      <SymbolView name="camera.fill" size={16} tintColor="#3c87f7" />
                      <ThemedText type="smallBold" style={styles.secondaryButtonText}>Abrir câmera</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            <ThemedText type="smallBold" style={styles.label}>Validade</ThemedText>
            <TextInput
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />

            <ThemedView type="backgroundSelected" style={styles.infoBox}>
              <SymbolView name="info.circle.fill" size={18} tintColor="#3c87f7" />
              <ThemedText type="code" style={styles.infoText}>
                {photoAsset ? 'Foto capturada com sucesso. Agora valide a data para seguir.' : 'Tire uma foto antes de avançar.'}
              </ThemedText>
            </ThemedView>

            <View style={styles.rowActions}>
              <Pressable style={[styles.secondaryButton, styles.buttonFlex]} onPress={goBack}>
                <SymbolView name="arrow.left" size={16} tintColor="#3c87f7" />
                <ThemedText type="smallBold" style={styles.secondaryButtonText}>Voltar</ThemedText>
              </Pressable>
              <Pressable style={[styles.primaryButton, styles.buttonFlex]} onPress={validateStep2}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>Ir para GPS</ThemedText>
                <SymbolView name="location.fill" size={16} tintColor="#ffffff" />
              </Pressable>
            </View>
          </ThemedView>
        )}

        {step === 3 && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>3. GPS e confirmação</ThemedText>

            <Pressable style={styles.gpsButton} onPress={captureLocation} disabled={loadingLocation}>
              <View style={styles.gpsIconWrap}>
                {loadingLocation ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <SymbolView name="location.fill" size={22} tintColor="#ffffff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Capturar localidade atual</ThemedText>
                <ThemedText type="code" style={styles.gpsButtonSubtext}>
                  Usar sua posição real para registrar a doação.
                </ThemedText>
              </View>
            </Pressable>

            <ThemedView type="backgroundSelected" style={styles.gpsCard}>
              <SymbolView name="map.fill" size={18} tintColor="#3c87f7" />
              <View style={{ flex: 1, marginLeft: Spacing.two }}>
                <ThemedText type="smallBold">{locationLabel}</ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={styles.helperText}>
                  {hasLocation
                    ? `Lat: ${latitude?.toFixed(5)} • Lng: ${longitude?.toFixed(5)}`
                    : 'Nenhuma coordenada capturada ainda.'}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, hasLocation ? styles.statusBadgeOk : styles.statusBadgeWarn]}>
                <ThemedText type="code" style={styles.statusBadgeText}>
                  {hasLocation ? 'GPS OK' : 'Pendente'}
                </ThemedText>
              </View>
            </ThemedView>

            <ThemedView type="backgroundSelected" style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <SymbolView name="checklist" size={18} tintColor="#ff9800" />
                <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>Revisão final</ThemedText>
              </View>

              <View style={styles.summaryRow}><ThemedText type="code" themeColor="textSecondary">Alimento</ThemedText><ThemedText type="code">{foodName}</ThemedText></View>
              <View style={styles.summaryRow}><ThemedText type="code" themeColor="textSecondary">Tipo</ThemedText><ThemedText type="code">{foodType}</ThemedText></View>
              <View style={styles.summaryRow}><ThemedText type="code" themeColor="textSecondary">Categoria</ThemedText><ThemedText type="code">{category}</ThemedText></View>
              <View style={styles.summaryRow}><ThemedText type="code" themeColor="textSecondary">Quantidade</ThemedText><ThemedText type="code">{quantity}</ThemedText></View>
              <View style={styles.summaryRow}><ThemedText type="code" themeColor="textSecondary">Validade</ThemedText><ThemedText type="code">{expiryDate}</ThemedText></View>
              <View style={styles.summaryRow}><ThemedText type="code" themeColor="textSecondary">Armazenamento</ThemedText><ThemedText type="code">{storageConditions}</ThemedText></View>
            </ThemedView>

            <View style={styles.rowActions}>
              <Pressable style={[styles.secondaryButton, styles.buttonFlex]} onPress={goBack}>
                <SymbolView name="arrow.left" size={16} tintColor="#3c87f7" />
                <ThemedText type="smallBold" style={styles.secondaryButtonText}>Voltar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, styles.buttonFlex]}
                onPress={submitDonation}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>Confirmar doação</ThemedText>
                    <SymbolView name="checkmark.circle.fill" size={16} tintColor="#ffffff" />
                  </>
                )}
              </Pressable>
            </View>
          </ThemedView>
        )}
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
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: '#123b6e',
    elevation: 2,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  progressCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 135, 247, 0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3c87f7',
  },
  feedbackError: {
    backgroundColor: '#f44336',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  feedbackSuccess: {
    backgroundColor: '#4caf50',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
    elevation: 2,
  },
  sectionTitle: {
    color: '#3c87f7',
    marginBottom: Spacing.one,
  },
  label: {
    marginTop: Spacing.one,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  pill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(150,150,150,0.08)',
  },
  pillActive: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  pillText: {
    fontSize: 11,
  },
  pillTextActive: {
    color: '#ffffff',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    backgroundColor: 'rgba(150,150,150,0.08)',
  },
  segmentActive: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  segmentText: {
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: Spacing.two,
    backgroundColor: '#3c87f7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: Spacing.two,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3c87f7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  secondaryButtonText: {
    color: '#3c87f7',
  },
  buttonFlex: {
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  photoPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: 'rgba(60, 135, 247, 0.06)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 135, 247, 0.10)',
    borderRadius: Spacing.two,
  },
  infoBox: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
  },
  gpsButton: {
    minHeight: 72,
    borderRadius: Spacing.three,
    backgroundColor: '#123b6e',
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  gpsIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsButtonSubtext: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.82,
    marginTop: 2,
  },
  gpsCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  helperText: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
  },
  statusBadgeOk: {
    backgroundColor: '#4caf50',
  },
  statusBadgeWarn: {
    backgroundColor: '#ff9800',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
  },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
