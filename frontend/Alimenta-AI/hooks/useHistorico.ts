import { useState, useEffect, useCallback } from 'react';
import * as historicoService from '@/services/historicoService';
import { handleApiError } from '@/utils/errorHandler';
import { authStore } from '@/store/authStore';
import type { HistoricoAtendimentoDTO } from '@/types';

export function useHistorico() {
  const [historico, setHistorico] = useState<HistoricoAtendimentoDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await historicoService.listarHistorico();
      setHistorico(data);
    } catch (e: any) {
      setError(handleApiError(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const registrar = useCallback(async (data: { semana: string; quantidade_atendida: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const ongId = authStore.getState().user?.ong?.id;
      if (!ongId) {
        throw new Error('Usuário não vinculado a uma ONG');
      }
      const novo = await historicoService.registrarAtendimento({
        ...data,
        ong_id: ongId,
      });
      setHistorico((prev) => [novo, ...prev].sort((a, b) => b.semana.localeCompare(a.semana)));
      return novo;
    } catch (e: any) {
      setError(handleApiError(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { historico, isLoading, error, refresh, registrar };
}
