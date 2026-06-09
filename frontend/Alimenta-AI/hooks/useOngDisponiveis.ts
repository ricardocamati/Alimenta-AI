import { useCallback, useEffect, useRef, useState } from 'react';

import api from '@/services/api';
import type { DoacaoOngDTO } from './useDoacoesOng';

export function useOngDisponiveis() {
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
      const data = (await api.get('/ongs/me/disponiveis', {
        signal: abortRef.current.signal,
      })) as DoacaoOngDTO[];
      setDoacoes(data);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
      setError(err?.response?.data?.detail || err?.message || 'Erro ao carregar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoacoes();
    return () => abortRef.current?.abort();
  }, [fetchDoacoes]);

  return { doacoes, isLoading, error, refresh: fetchDoacoes };
}
