import { useCallback, useEffect, useState } from 'react';

import {
  getOngMe,
  updateOngPreferences,
  type OngMeDTO,
  type OngPreferencesUpdate,
} from '@/services/ongService';

export function useNgoPreferences() {
  const [ong, setOng] = useState<OngMeDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOng = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOngMe();
      setOng(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao carregar ONG');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = useCallback(async (prefs: OngPreferencesUpdate) => {
    const data = await updateOngPreferences(prefs);
    setOng(data);
    return data;
  }, []);

  useEffect(() => {
    fetchOng();
  }, [fetchOng]);

  return { ong, isLoading, error, update, refresh: fetchOng };
}
