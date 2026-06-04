import api from './api';

export interface CEPData {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
  latitude?: number;
  longitude?: number;
}

export async function lookupCEP(cep: string): Promise<CEPData | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    return (await api.get(`/auth/cep/${digits}`)) as CEPData;
  } catch {
    return null;
  }
}
