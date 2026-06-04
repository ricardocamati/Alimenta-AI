import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';

import * as doacaoService from '@/services/doacaoService';
import { handleApiError } from '@/utils/errorHandler';
import type { CreateDoacaoDTO, DoacaoDTO } from '@/types';

export function useDoacao() {
  const [doacoes, setDoacoes] = useState<DoacaoDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDoacoes = useCallback(async (append = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setError(null);
    setIsLoading(true);
    try {
      const result = await doacaoService.listDoacoes(20, append ? offsetRef.current : 0);
      setDoacoes((prev) => (append ? [...prev, ...result] : result));
      setHasMore(result.length === 20);
      offsetRef.current = append ? offsetRef.current + result.length : result.length;
    } catch (err) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDoacao = useCallback(async (data: CreateDoacaoDTO): Promise<DoacaoDTO> => {
    setError(null);
    try {
      const created = await doacaoService.createDoacao(data);
      Alert.alert('Doação registrada', `${data.tipo_alimento} cadastrado com sucesso!`);
      await fetchDoacoes(false);
      return created;
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      throw new Error(msg);
    }
  }, [fetchDoacoes]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) fetchDoacoes(true);
  }, [isLoading, hasMore, fetchDoacoes]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetchDoacoes(false);
  }, [fetchDoacoes]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { doacoes, isLoading, error, hasMore, createDoacao, loadMore, refresh };
}
