import { useState, useCallback, useRef, useEffect } from 'react';
import api from '@/services/api';
import type { DoacaoDTO } from '@/types';

export type DoacaoOngDTO = DoacaoDTO;

export function useDoacoesOng() {
  const [doacoes, setDoacoes] = useState<DoacaoOngDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDoacoes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      // O interceptor de response retorna response.data diretamente
      const data = await api.get<DoacaoOngDTO[]>('/doacoes/ongs/me/doacoes', {
        signal: abortRef.current.signal,
      });
      setDoacoes(data as any);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.response?.data?.detail || err.message || 'Erro ao carregar doações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const atualizarStatus = useCallback(async (
    doacaoId: number,
    status: string,
    observacao?: string
  ): Promise<DoacaoOngDTO | null> => {
    try {
      // O interceptor de response retorna response.data diretamente
      const data = await api.patch<DoacaoOngDTO>(`/doacoes/${doacaoId}/status`, {
        status,
        observacao,
      });
      setDoacoes(prev => prev.map(d => d.id === (data as any).id ? (data as any) : d));
      return data as any;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erro ao atualizar status');
      return null;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchDoacoes();
  }, [fetchDoacoes]);

  useEffect(() => {
    fetchDoacoes();
    return () => abortRef.current?.abort();
  }, [fetchDoacoes]);

  return {
    doacoes,
    isLoading,
    error,
    refresh,
    atualizarStatus,
  };
}
