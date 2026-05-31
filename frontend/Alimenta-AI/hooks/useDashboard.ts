import { useState, useCallback, useRef, useEffect } from 'react';

import * as dashboardService from '@/services/dashboardService';
import { handleApiError } from '@/utils/errorHandler';
import type { DashboardResponseDTO } from '@/types';

export function useDashboard() {
  const [data, setData] = useState<DashboardResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setError(null);
    setIsLoading(true);
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
    } catch (err) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { data, isLoading, error, refresh };
}
