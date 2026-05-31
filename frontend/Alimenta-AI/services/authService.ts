import api from './api';
import { authStore } from '@/store/authStore';
import type { LoginDTO, RegisterDTO, TokenResponseDTO, UserDTO } from '@/types';

export async function login(data: LoginDTO): Promise<TokenResponseDTO> {
  const result = await api.post('/auth/login', data) as TokenResponseDTO;
  await authStore.setToken(result.access_token);
  return result;
}

export async function register(data: RegisterDTO): Promise<UserDTO> {
  const result = await api.post('/auth/register', data) as UserDTO;
  return result;
}

export async function getMe(): Promise<UserDTO> {
  const result = await api.get('/auth/me') as UserDTO;
  return result;
}

export async function logout(): Promise<void> {
  await authStore.clearAuth();
}
