import { useCallback, useEffect, useRef, useState } from 'react';

import {
  listNotificacoes,
  markAllNotificacoesRead,
  markNotificacaoRead,
  triggerExpiryAlerts,
  type NotificacaoCategory,
  type NotificacaoDTO,
} from '@/services/notificationService';

export interface UseNotificationsOptions {
  category?: NotificacaoCategory;
  unreadOnly?: boolean;
  autoRefresh?: boolean;
  intervalMs?: number;
}

export function useNotifications(opts: UseNotificationsOptions = {}) {
  const { category, unreadOnly = false, autoRefresh = false, intervalMs = 30_000 } = opts;
  const [notifs, setNotifs] = useState<NotificacaoDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchNotifs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const data = await listNotificacoes(unreadOnly, category);
      setNotifs(data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      setError((err as Error).message || 'Erro ao carregar notificacoes');
    } finally {
      setIsLoading(false);
    }
  }, [unreadOnly, category]);

  const markRead = useCallback(async (id: number) => {
    try {
      const updated = await markNotificacaoRead(id);
      setNotifs(prev => prev.map(n => (n.id === updated.id ? updated : n)));
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao marcar como lida');
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificacoesRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao marcar todas como lidas');
    }
  }, []);

  const triggerExpiry = useCallback(async (): Promise<number> => {
    const res = await triggerExpiryAlerts();
    await fetchNotifs();
    return res.criadas;
  }, [fetchNotifs]);

  const refresh = useCallback(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  useEffect(() => {
    fetchNotifs();
    return () => abortRef.current?.abort();
  }, [fetchNotifs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchNotifs, intervalMs);
    return () => clearInterval(t);
  }, [autoRefresh, intervalMs, fetchNotifs]);

  return { notifs, isLoading, error, markRead, markAllRead, triggerExpiry, refresh };
}
