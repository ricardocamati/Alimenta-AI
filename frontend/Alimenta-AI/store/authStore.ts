import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { UserDTO } from '@/types';

const USER_KEY = 'auth_user';
const TOKEN_KEY = 'auth_token';

export interface AuthState {
  user: UserDTO | null;
  token: string | null;
  isLoading: boolean;
}

type AuthListener = (state: AuthState) => void;

const listeners = new Set<AuthListener>();

let state: AuthState = {
  user: null,
  token: null,
  isLoading: true,
};

function emit() {
  listeners.forEach((l) => l(state));
}

async function storageGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore
  }
}

async function storageDelete(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

export const authStore = {
  getState: () => state,

  subscribe: (listener: AuthListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setUser: (user: UserDTO | null) => {
    state = { ...state, user };
    if (user) {
      storageSet(USER_KEY, JSON.stringify(user));
    } else {
      storageDelete(USER_KEY);
    }
    emit();
  },

  setToken: async (token: string | null) => {
    state = { ...state, token };
    if (token) {
      await storageSet(TOKEN_KEY, token);
    } else {
      await storageDelete(TOKEN_KEY);
    }
    emit();
  },

  setIsLoading: (isLoading: boolean) => {
    state = { ...state, isLoading };
    emit();
  },

  clearAuth: async () => {
    state = { ...state, user: null, token: null };
    await storageDelete(TOKEN_KEY);
    await storageDelete(USER_KEY);
    emit();
  },

  loadFromStorage: async () => {
    try {
      const token = await storageGet(TOKEN_KEY);
      const userStr = await storageGet(USER_KEY);
      const user = userStr ? (JSON.parse(userStr) as UserDTO) : null;
      state = { token, user, isLoading: false };
      emit();
    } catch {
      state = { token: null, user: null, isLoading: false };
      emit();
    }
  },
};
