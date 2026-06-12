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
    const result = await api.get(`/auth/cep/${digits}`);
    return result as CEPData;
  } catch {
    // Fallback direto para ViaCEP se backend falhar
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (data.erro) return null;
      return {
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
        complemento: data.complemento || '',
      };
    } catch {
      return null;
    }
  }
}
