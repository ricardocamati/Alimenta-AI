export type TipoUsuario = 'doador' | 'ong' | 'admin';
export type StatusDoacao = 'cadastrado' | 'analisado' | 'matched' | 'notificado' | 'coletado' | 'confirmado' | 'cancelado';
export type Urgencia = 'baixa' | 'media' | 'alta' | 'critica';

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface RegisterDTO {
  nome: string;
  email: string;
  senha: string;
  tipo: TipoUsuario;
  cpf_cnpj?: string;
  endereco?: string;
  telefone?: string;
  ong?: {
    cnpj: string;
    capacidade_atendimento: number;
    latitude: number;
    longitude: number;
  };
}

export interface TokenResponseDTO {
  access_token: string;
  token_type: string;
}

export interface ONGDTO {
  id: number;
  cnpj: string;
  capacidade_atendimento: number;
  latitude: number;
  longitude: number;
}

export interface UserDTO {
  id: number;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  cpf_cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  criado_em: string;
  ong: ONGDTO | null;
}

export interface CreateDoacaoDTO {
  tipo_alimento: string;
  categoria: string;
  quantidade: number;
  data_validade: string;
  foto_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface DoacaoDTO {
  id: number;
  doador_id: number;
  tipo_alimento: string;
  categoria: string;
  quantidade: number;
  foto_url: string | null;
  data_validade: string;
  latitude: number | null;
  longitude: number | null;
  status: StatusDoacao;
  urgencia: Urgencia;
  score_matching: number | null;
  criado_em: string;
  atualizado_em: string;
}

export interface LogAFDDTO {
  id: number;
  estado_anterior: string;
  estado_novo: string;
  timestamp: string;
  descricao: string | null;
}

export interface DoacaoDetailedDTO extends DoacaoDTO {
  logs: LogAFDDTO[];
}

export interface DashboardDoadorDTO {
  perfil: 'doador';
  total_doacoes: number;
  doacoes_confirmadas: number;
  doacoes_canceladas: number;
  taxa_aproveitamento: number;
  tempo_medio_coleta_horas: number | null;
  distribuicao_urgencia: Record<string, number>;
  ultimas_doacoes: {
    id: number;
    tipo_alimento: string;
    urgencia: Urgencia;
    status: StatusDoacao;
    criado_em: string;
  }[];
}

export interface DashboardONGDTO {
  perfil: 'ong';
  total_doacoes_recebidas: number;
  demanda_prevista_proxima_semana: number;
  alerta_escassez: boolean;
  doacoes_pendentes: number;
  distribuicao_categorias: Record<string, number>;
  ultimas_doacoes: {
    id: number;
    tipo_alimento: string;
    urgencia: Urgencia;
    status: StatusDoacao;
    criado_em: string;
  }[];
}

export interface DashboardAdminDTO {
  perfil: 'admin';
  total_usuarios: number;
  total_doacoes: number;
  total_ongs: number;
  taxa_aproveitamento_geral: number;
  tempo_medio_coleta_horas: number | null;
  doacoes_por_status: Record<string, number>;
  doacoes_por_urgencia: Record<string, number>;
  top_5_doadores: { nome: string; total_doacoes: number; taxa_aproveitamento: number }[];
  top_5_ongs: { nome: string; total_recebido: number; demanda_prevista: number }[];
}

export type DashboardResponseDTO = DashboardDoadorDTO | DashboardONGDTO | DashboardAdminDTO;
