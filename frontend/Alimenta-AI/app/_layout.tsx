import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { authStore } from '@/store/authStore';
import * as authService from '@/services/authService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    authStore.loadFromStorage().then(() => {
      const s = authStore.getState();
      if (s.token && !s.user) {
        authService.getMe()
          .then((u) => authStore.setUser(u))
          .catch(() => authStore.clearAuth())
          .finally(() => setReady(true));
      } else {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' }}>
        <ActivityIndicator size="large" color="#3c87f7" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
