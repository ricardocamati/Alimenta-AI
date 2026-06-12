import api from './api';

export type NotificacaoCategory = 'expiry' | 'scarcity' | 'status' | 'system';
export type NotificacaoUserType = 'doador' | 'ong' | 'admin';

export interface NotificacaoDTO {
  id: number;
  user_id: string;
  user_type: NotificacaoUserType;
  title: string;
  message: string;
  category: NotificacaoCategory;
  related_donation_id: number | null;
  read: boolean;
  timestamp: string;
}

export async function listNotificacoes(
  unreadOnly = false,
  category?: NotificacaoCategory
): Promise<NotificacaoDTO[]> {
  const params: Record<string, string | boolean> = {};
  if (unreadOnly) params.unread_only = true;
  if (category) params.category = category;
  return api.get('/notifications/', { params }) as Promise<NotificacaoDTO[]>;
}

export async function markNotificacaoRead(id: number): Promise<NotificacaoDTO> {
  return api.patch(`/notifications/${id}/read`) as Promise<NotificacaoDTO>;
}

export async function markAllNotificacoesRead(): Promise<{ atualizadas: number }> {
  return api.patch('/notifications/read-all') as Promise<{ atualizadas: number }>;
}

export async function triggerExpiryAlerts(): Promise<{ criadas: number }> {
  return api.post('/notifications/trigger-expiry') as Promise<{ criadas: number }>;
}
