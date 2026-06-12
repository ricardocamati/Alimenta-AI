import api from './api';

export interface OngMeDTO {
  id: number;
  cnpj: string;
  capacidade_atendimento: number;
  latitude: number;
  longitude: number;
  pickup_radius: number | null;
  accepted_food_types: string[] | null;
  pickup_schedule: string | null;
}

export interface OngPreferencesUpdate {
  capacidade_atendimento?: number;
  pickup_radius?: number;
  accepted_food_types?: string[];
  pickup_schedule?: string;
}

export async function getOngMe(): Promise<OngMeDTO> {
  return api.get('/ongs/me') as Promise<OngMeDTO>;
}

export async function updateOngPreferences(
  prefs: OngPreferencesUpdate
): Promise<OngMeDTO> {
  return api.patch('/ongs/me/preferences', prefs) as Promise<OngMeDTO>;
}
