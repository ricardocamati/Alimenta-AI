import api from './api';

export interface WeightsDTO {
  urgency: number;
  demand: number;
  distance: number;
  updated_at: string | null;
}

export interface WeightsUpdate {
  urgency: number;
  demand: number;
  distance: number;
}

export interface AdminUserDTO {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  cpf_cnpj: string | null;
  criado_em: string;
  ong_id: number | null;
}

export interface AdminOngDTO {
  id: number;
  usuario_id: number;
  cnpj: string;
  capacidade_atendimento: number;
  latitude: number;
  longitude: number;
  pickup_radius: number | null;
  accepted_food_types: string | null;
  pickup_schedule: string | null;
  usuario_nome: string | null;
}

export interface AdminAuditLogDTO {
  id: number;
  doacao_id: number;
  estado_anterior: string;
  estado_novo: string;
  timestamp: string;
  descricao: string | null;
  doacao_nome: string | null;
}

export async function getAdminUsers(): Promise<AdminUserDTO[]> {
  return api.get('/admin/users') as Promise<AdminUserDTO[]>;
}

export async function getAdminOngs(): Promise<AdminOngDTO[]> {
  return api.get('/admin/ongs') as Promise<AdminOngDTO[]>;
}

export async function getAdminAuditLogs(
  limit = 50,
  offset = 0
): Promise<AdminAuditLogDTO[]> {
  return api.get('/admin/audit-logs', { params: { limit, offset } }) as Promise<AdminAuditLogDTO[]>;
}

export async function getAdminWeights(): Promise<WeightsDTO> {
  return api.get('/admin/weights') as Promise<WeightsDTO>;
}

export async function updateAdminWeights(payload: WeightsUpdate): Promise<WeightsDTO> {
  return api.patch('/admin/weights', payload) as Promise<WeightsDTO>;
}

export async function triggerAdminRetrain(): Promise<{ treinados_em: string; scripts: unknown[] }> {
  return api.post('/admin/retrain') as Promise<{ treinados_em: string; scripts: unknown[] }>;
}
