import api from './api';
import type { CreateDoacaoDTO, DoacaoDTO, DoacaoDetailedDTO } from '@/types';

export async function createDoacao(data: CreateDoacaoDTO): Promise<DoacaoDTO> {
  return api.post('/doacoes/', data) as Promise<DoacaoDTO>;
}

export async function listDoacoes(limit = 20, offset = 0): Promise<DoacaoDTO[]> {
  return api.get('/doacoes/', { params: { limit, offset } }) as Promise<DoacaoDTO[]>;
}

export async function getDoacaoById(id: number): Promise<DoacaoDetailedDTO> {
  return api.get(`/doacoes/${id}`) as Promise<DoacaoDetailedDTO>;
}
