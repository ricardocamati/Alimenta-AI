import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { authStore } from '@/store/authStore';

export default function IndexRedirect() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [authState, setAuthState] = useState(authStore.getState());
  const redirectedRef = useRef(false);

  useEffect(() => {
    const unsub = authStore.subscribe((s) => setAuthState(s));
    return unsub;
  }, []);

  useEffect(() => {
    if (authState.isLoading || redirectedRef.current) return;
    redirectedRef.current = true;
    const timer = setTimeout(() => {
      if (!authState.user) {
        router.replace('/login');
      } else if (authState.user.tipo === 'doador') {
        router.replace('/donor');
      } else if (authState.user.tipo === 'ong') {
        router.replace('/ngo');
      } else {
        router.replace('/admin');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [authState, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' }}>
      <ActivityIndicator size="large" color="#3c87f7" />
    </View>
  );
}
