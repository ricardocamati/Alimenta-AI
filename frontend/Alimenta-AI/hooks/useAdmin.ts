import { useCallback, useEffect, useState } from 'react';

import {
  getAdminAuditLogs,
  getAdminOngs,
  getAdminUsers,
  getAdminWeights,
  triggerAdminRetrain,
  updateAdminWeights,
  type AdminAuditLogDTO,
  type AdminOngDTO,
  type AdminUserDTO,
  type WeightsDTO,
  type WeightsUpdate,
} from '@/services/adminService';

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao carregar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  return { users, isLoading, error, refresh: fetchUsers };
}

export function useAdminOngs() {
  const [ongs, setOngs] = useState<AdminOngDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOngs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminOngs();
      setOngs(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao carregar ONGs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOngs(); }, [fetchOngs]);
  return { ongs, isLoading, error, refresh: fetchOngs };
}

export function useAdminAuditLogs(limit = 50) {
  const [logs, setLogs] = useState<AdminAuditLogDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminAuditLogs(limit);
      setLogs(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  return { logs, isLoading, error, refresh: fetchLogs };
}

export function useAdminWeights() {
  const [weights, setWeights] = useState<WeightsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchWeights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminWeights();
      setWeights(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao carregar pesos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (payload: WeightsUpdate) => {
    setIsSaving(true);
    try {
      const data = await updateAdminWeights(payload);
      setWeights(data);
      return data;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const retrain = useCallback(async () => {
    return triggerAdminRetrain();
  }, []);

  useEffect(() => { fetchWeights(); }, [fetchWeights]);
  return { weights, isLoading, error, isSaving, save, retrain, refresh: fetchWeights };
}
