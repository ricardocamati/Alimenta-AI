import api from './api';
import type { HistoricoAtendimentoDTO } from '@/types';

export async function listarHistorico(): Promise<HistoricoAtendimentoDTO[]> {
  return api.get('/historico/me') as Promise<HistoricoAtendimentoDTO[]>;
}

export async function registrarAtendimento(data: {
  semana: string;
  quantidade_atendida: number;
}): Promise<HistoricoAtendimentoDTO> {
  return api.post('/historico/', data) as Promise<HistoricoAtendimentoDTO>;
}
