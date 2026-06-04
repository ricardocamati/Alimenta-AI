import api from './api';
import type { DashboardResponseDTO } from '@/types';

export async function getDashboard(): Promise<DashboardResponseDTO> {
  return api.get('/dashboard/') as Promise<DashboardResponseDTO>;
}
