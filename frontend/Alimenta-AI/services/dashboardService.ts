import api from './api';
import type { DashboardResponseDTO } from '@/types';

export async function getDashboard(perfil?: 'doador' | 'ong' | 'admin'): Promise<DashboardResponseDTO> {
  const url = perfil ? `/dashboard/?perfil=${perfil}` : '/dashboard/';
  return api.get(url) as Promise<DashboardResponseDTO>;
}
