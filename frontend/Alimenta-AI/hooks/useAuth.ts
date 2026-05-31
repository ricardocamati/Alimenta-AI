import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { authStore } from '@/store/authStore';
import * as authService from '@/services/authService';
import { handleApiError } from '@/utils/errorHandler';
import type { LoginDTO, RegisterDTO, UserDTO } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<UserDTO | null>(authStore.getState().user);
  const [isLoading, setIsLoading] = useState(authStore.getState().isLoading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authStore.loadFromStorage().then(() => {
      const s = authStore.getState();
      setUser(s.user);
      setIsLoading(false);

      if (s.token && !s.user) {
        authService.getMe()
          .then((u) => {
            authStore.setUser(u);
            setUser(u);
          })
          .catch(() => authStore.clearAuth())
          .finally(() => setIsLoading(false));
      }
    });

    return authStore.subscribe((s) => {
      setUser(s.user);
      setIsLoading(s.isLoading);
    });
  }, []);

  const login = useCallback(async (data: LoginDTO) => {
    setError(null);
    setIsLoading(true);
    try {
      const tokenRes = await authService.login(data);
      const me = await authService.getMe();
      authStore.setUser(me);
      setUser(me);
      Alert.alert('Login realizado', `Bem-vindo(a), ${me.nome}!`);

      if (me.tipo === 'admin') router.replace('/admin');
      else if (me.tipo === 'doador') router.replace('/donor');
      else router.replace('/ngo');
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterDTO) => {
    setError(null);
    setIsLoading(true);
    try {
      const newUser = await authService.register(data);
      Alert.alert('Cadastro realizado', 'Conta criada com sucesso!');

      await authService.login({ email: data.email, senha: data.senha });
      const me = await authService.getMe();
      authStore.setUser(me);
      setUser(me);

      if (me.tipo === 'doador') router.replace('/donor');
      else router.replace('/ngo');
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.replace('/');
  }, []);

  return { user, isLoading, error, login, register, logout, setError };
}
