import { useState, useEffect } from 'react';

export type DonationStatus = 'Cadastrado' | 'Analisado' | 'Matched' | 'Notificado' | 'Coletado' | 'Confirmado' | 'Cancelado';

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  name: string;
  type: string;
  category: 'Perecível' | 'Não Perecível';
  quantity: string;
  expiryDate: string;
  photoId: string;
  photoUrl?: string;
  storageConditions: string;
  status: DonationStatus;
  matchScore: number;
  matchedNgoId: string;
  matchedNgoName: string;
  timestamp: string;
  urgency?: string;
  lat?: number;
  lng?: number;
  history?: { status: DonationStatus; timestamp: string }[];
}

export interface Notification {
  id: string;
  userId: string;
  userType: 'donor' | 'ngo' | 'admin';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'expiry' | 'scarcity' | 'status' | 'system';
  relatedDonationId?: string;
}

export interface AuditLog {
  id: string;
  donationName: string;
  donationId: string;
  fromStatus: string;
  toStatus: string;
  actor: string;
  notes: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  role: 'donor' | 'ngo' | 'admin';
  cnpjCpf?: string;
  address?: string;
  phone?: string;
  password?: string;
}

export interface Ngo {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  capacity: number;
  userId: string;
  history: number[];
  predictedDemand: number;
}

interface Weights {
  urgency: number;
  demand: number;
  distance: number;
}

interface StoreState {
  currentUser: User | null;
  users: User[];
  ngos: Ngo[];
  donations: Donation[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  weights: Weights;
  mlModelsRetrainedDate: string;
  donationCount: number;
  notifCount: number;
  logCount: number;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function isoNow(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function uid(): string {
  return Math.random().toString(36).substring(2, 10);
}

let seedDonations: Donation[] = [
  {
    id: 'd1', donorId: 'donor_1', donorName: 'Supermercado Central',
    name: 'Cesta de Verduras', type: 'Fruta/Legume', category: 'Perecível',
    quantity: '25', expiryDate: daysFromNow(1), photoId: 'vegetables',
    storageConditions: 'Temperatura Ambiente', status: 'Matched',
    matchScore: 88, matchedNgoId: 'ngo_1', matchedNgoName: 'ONG Prato Cheio',
    timestamp: isoNow(), urgency: 'alta',
  },
  {
    id: 'd2', donorId: 'donor_1', donorName: 'Supermercado Central',
    name: 'Tomates', type: 'Fruta/Legume', category: 'Perecível',
    quantity: '40', expiryDate: daysFromNow(10), photoId: 'tomatoes',
    storageConditions: 'Refrigerado', status: 'Coletado',
    matchScore: 92, matchedNgoId: 'ngo_1', matchedNgoName: 'ONG Prato Cheio',
    timestamp: daysFromNow(-5), urgency: 'media',
  },
  {
    id: 'd3', donorId: 'donor_1', donorName: 'Supermercado Central',
    name: 'Pão Caseiro', type: 'Panificação', category: 'Perecível',
    quantity: '60', expiryDate: daysFromNow(15), photoId: 'bread',
    storageConditions: 'Temperatura Ambiente', status: 'Confirmado',
    matchScore: 85, matchedNgoId: 'ngo_2', matchedNgoName: 'ONG Mesa Brasil',
    timestamp: daysFromNow(-8), urgency: 'baixa',
  },
  {
    id: 'd4', donorId: 'donor_1', donorName: 'Supermercado Central',
    name: 'Leite Longa Vida', type: 'Laticínio', category: 'Não Perecível',
    quantity: '120', expiryDate: daysFromNow(2), photoId: 'milk',
    storageConditions: 'Temperatura Ambiente', status: 'Cadastrado',
    matchScore: 75, matchedNgoId: 'ngo_1', matchedNgoName: 'ONG Prato Cheio',
    timestamp: daysFromNow(-2), urgency: 'media',
  },
  {
    id: 'd5', donorId: 'donor_1', donorName: 'Supermercado Central',
    name: 'Carne Bovina', type: 'Carne', category: 'Perecível',
    quantity: '30', expiryDate: todayStr(), photoId: 'meats',
    storageConditions: 'Congelado', status: 'Analisado',
    matchScore: 90, matchedNgoId: 'ngo_2', matchedNgoName: 'ONG Mesa Brasil',
    timestamp: daysFromNow(-1), urgency: 'critica',
  },
  {
    id: 'd6', donorId: 'donor_2', donorName: 'Supermercado Bom Preço',
    name: 'Laranjas', type: 'Fruta/Legume', category: 'Perecível',
    quantity: '55', expiryDate: daysFromNow(8), photoId: 'oranges',
    storageConditions: 'Temperatura Ambiente', status: 'Notificado',
    matchScore: 82, matchedNgoId: 'ngo_1', matchedNgoName: 'ONG Prato Cheio',
    timestamp: daysFromNow(-3), urgency: 'baixa',
  },
  {
    id: 'd7', donorId: 'donor_3', donorName: 'Padaria Pão Quente',
    name: 'Pão Caseiro', type: 'Panificação', category: 'Perecível',
    quantity: '35', expiryDate: daysFromNow(3), photoId: 'bread',
    storageConditions: 'Temperatura Ambiente', status: 'Matched',
    matchScore: 78, matchedNgoId: 'ngo_2', matchedNgoName: 'ONG Mesa Brasil',
    timestamp: daysFromNow(-1), urgency: 'alta',
  },
  {
    id: 'd8', donorId: 'donor_2', donorName: 'Supermercado Bom Preço',
    name: 'Leite Longa Vida', type: 'Laticínio', category: 'Não Perecível',
    quantity: '90', expiryDate: daysFromNow(25), photoId: 'milk',
    storageConditions: 'Temperatura Ambiente', status: 'Confirmado',
    matchScore: 88, matchedNgoId: 'ngo_2', matchedNgoName: 'ONG Mesa Brasil',
    timestamp: daysFromNow(-12), urgency: 'baixa',
  },
];

let seedNotifications: Notification[] = [
  {
    id: 'n1', userId: 'donor_1', userType: 'donor',
    title: 'Coleta Confirmada', message: 'ONG Prato Cheio confirmou o recebimento de Pão Caseiro (60 unidades).',
    timestamp: daysFromNow(-6), read: true, category: 'status', relatedDonationId: 'd3',
  },
  {
    id: 'n2', userId: 'ngo_1', userType: 'ngo',
    title: 'Nova Doação Matched', message: 'Supermercado Central publicou Cesta de Verduras (25 kg). Score de match: 88.',
    timestamp: daysFromNow(-1), read: false, category: 'status', relatedDonationId: 'd1',
  },
  {
    id: 'n3', userId: 'admin', userType: 'admin',
    title: 'Alerta de Escassez - ONG Mesa Brasil', message: 'Demanda prevista (320 refeições/semana) 45% acima da média de doações ativas. Risco de falta de alimentos para os próximos 7 dias.',
    timestamp: isoNow(), read: false, category: 'scarcity',
  },
  {
    id: 'n4', userId: 'admin', userType: 'admin',
    title: 'Alerta de Escassez - ONG Prato Cheio', message: 'Estoque projetado para 3 dias. Demanda 30% acima da capacidade de matching atual. Considere campanha de arrecadação urgente.',
    timestamp: daysFromNow(-1), read: true, category: 'scarcity',
  },
  {
    id: 'n5', userId: 'ngo_1', userType: 'ngo',
    title: 'Alerta de Vencimento - Carne Bovina', message: 'Doação de Carne Bovina (30 kg) do Supermercado Central vence HOJE. Prioridade máxima de coleta.',
    timestamp: isoNow(), read: false, category: 'expiry', relatedDonationId: 'd5',
  },
  {
    id: 'n6', userId: 'ngo_2', userType: 'ngo',
    title: 'Alerta de Vencimento - Cesta de Verduras', message: 'Doação de Cesta de Verduras (25 kg) do Supermercado Central vence em 1 dia. Agende coleta urgente.',
    timestamp: isoNow(), read: false, category: 'expiry', relatedDonationId: 'd1',
  },
  {
    id: 'n7', userId: 'donor_1', userType: 'donor',
    title: 'Match Encontrado', message: 'Sua doação de Carne Bovina foi matched com ONG Mesa Brasil. Score de compatibilidade: 90.',
    timestamp: daysFromNow(-1), read: false, category: 'status', relatedDonationId: 'd5',
  },
];

let seedAuditLogs: AuditLog[] = [
  {
    id: 'a1', donationName: 'Pão Caseiro', donationId: 'd3',
    fromStatus: 'Coletado', toStatus: 'Confirmado',
    actor: 'ONG Mesa Brasil', notes: 'Recebido em perfeitas condições. 60 unidades conferidas.',
    timestamp: daysFromNow(-6),
  },
  {
    id: 'a2', donationName: 'Tomates', donationId: 'd2',
    fromStatus: 'Notificado', toStatus: 'Coletado',
    actor: 'ONG Prato Cheio', notes: 'Coleta realizada no endereço do doador.',
    timestamp: daysFromNow(-4),
  },
  {
    id: 'a3', donationName: 'Cesta de Verduras', donationId: 'd1',
    fromStatus: 'Analisado', toStatus: 'Matched',
    actor: 'Sistema (ML)', notes: 'Match automático via Random Forest. Score de urgência: 88. Distância: 2.3 km.',
    timestamp: daysFromNow(-2),
  },
  {
    id: 'a4', donationName: 'Laranjas', donationId: 'd6',
    fromStatus: 'Matched', toStatus: 'Notificado',
    actor: 'ONG Prato Cheio', notes: 'ONG notificada sobre disponibilidade para coleta.',
    timestamp: daysFromNow(-3),
  },
];

let seedUsers: User[] = [
  { id: 'donor_1', name: 'Supermercado Central', role: 'donor', cnpjCpf: '12.345.678/0001-90', address: 'Av. Paulista, 1000', phone: '(11) 99999-0001', password: '123' },
  { id: 'donor_2', name: 'Supermercado Bom Preço', role: 'donor', cnpjCpf: '98.765.432/0001-10', address: 'Rua Augusta, 500', phone: '(11) 98888-0002', password: '123' },
  { id: 'donor_3', name: 'Padaria Pão Quente', role: 'donor', cnpjCpf: '55.444.333/0001-22', address: 'Rua Oscar Freire, 300', phone: '(11) 97777-0003', password: '123' },
  { id: 'ngo_1', name: 'ONG Prato Cheio', role: 'ngo', cnpjCpf: '11.222.333/0001-44', address: 'Rua da Consolação, 800', phone: '(11) 96666-0004', password: '123' },
  { id: 'ngo_2', name: 'ONG Mesa Brasil', role: 'ngo', cnpjCpf: '44.555.666/0001-77', address: 'Av. Rebouças, 1200', phone: '(11) 95555-0005', password: '123' },
  { id: 'admin_1', name: 'Administrador', role: 'admin', cnpjCpf: '', address: '', phone: '', password: 'admin' },
];

let seedNgos: Ngo[] = [
  { id: 'ngo_1', name: 'ONG Prato Cheio', cnpj: '11.222.333/0001-44', address: 'Rua da Consolação, 800', capacity: 250, userId: 'ngo_1', history: [180, 210, 195, 230], predictedDemand: 260 },
  { id: 'ngo_2', name: 'ONG Mesa Brasil', cnpj: '44.555.666/0001-77', address: 'Av. Rebouças, 1200', capacity: 320, userId: 'ngo_2', history: [250, 270, 240, 290], predictedDemand: 320 },
];

let state: StoreState = {
  currentUser: null,
  users: [...seedUsers],
  ngos: [...seedNgos],
  donations: [...seedDonations],
  notifications: [...seedNotifications],
  auditLogs: [...seedAuditLogs],
  weights: { urgency: 0.45, demand: 0.35, distance: 0.20 },
  mlModelsRetrainedDate: daysFromNow(-2),
  donationCount: seedDonations.length,
  notifCount: seedNotifications.length,
  logCount: seedAuditLogs.length,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function nextDonationId(): string {
  state.donationCount++;
  return 'd' + state.donationCount;
}

function nextNotifId(): string {
  state.notifCount++;
  return 'n' + state.notifCount;
}

function nextLogId(): string {
  state.logCount++;
  return 'a' + state.logCount;
}

export function useStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    get currentUser() { return state.currentUser; },
    get users() { return state.users; },
    get ngos() { return state.ngos; },
    get donations() { return state.donations; },
    get notifications() { return state.notifications; },
    get auditLogs() { return state.auditLogs; },
    get weights() { return state.weights; },
    get mlModelsRetrainedDate() { return state.mlModelsRetrainedDate; },

    login(role: 'donor' | 'ngo' | 'admin', identifier: string): boolean {
      const normalizedId = identifier.toLowerCase().trim();

      if (role === 'admin' && (normalizedId === 'admin' || normalizedId === 'administrador')) {
        state.currentUser = seedUsers.find(u => u.id === 'admin_1')!;
        emit();
        return true;
      }

      const user = state.users.find(u =>
        u.role === role && (
          u.name.toLowerCase().includes(normalizedId) ||
          (u.cnpjCpf && u.cnpjCpf.includes(identifier)) ||
          u.id.toLowerCase().includes(normalizedId)
        )
      );

      if (user) {
        state.currentUser = user;
        emit();
        return true;
      }

      return false;
    },

    registerDonor(data: { name: string; cnpjCpf: string; address: string; phone: string }) {
      const newId = 'donor_' + uid();
      const newUser: User = {
        id: newId,
        name: data.name,
        role: 'donor',
        cnpjCpf: data.cnpjCpf,
        address: data.address,
        phone: data.phone,
        password: '123',
      };
      state.users = [...state.users, newUser];
      state.currentUser = newUser;
      emit();
    },

    registerNgo(data: { name: string; cnpj: string; address: string; capacity: number }) {
      const newId = 'ngo_' + uid();
      const newUser: User = {
        id: newId,
        name: data.name,
        role: 'ngo',
        cnpjCpf: data.cnpj,
        address: data.address,
        phone: '',
        password: '123',
      };
      const newNgo: Ngo = {
        id: newId,
        name: data.name,
        cnpj: data.cnpj,
        address: data.address,
        capacity: data.capacity,
        userId: newId,
      };
      state.users = [...state.users, newUser];
      state.ngos = [...state.ngos, newNgo];
      state.currentUser = newUser;
      emit();
    },

    recoverPassword(email: string) {
      emit();
    },

    logout() {
      state.currentUser = null;
      emit();
    },

    registerDonation(data: {
      name: string;
      type: string;
      category: 'Perecível' | 'Não Perecível';
      quantity: string;
      expiryDate: string;
      photoUrl: string;
      storageConditions: string;
      lat?: number;
      lng?: number;
    }): Donation {
      const donorId = state.currentUser?.id || 'donor_1';
      const donorName = state.currentUser?.name || 'Doador Anônimo';

      const ngoMatch = state.ngos[Math.floor(Math.random() * state.ngos.length)];
      const matchScore = Math.floor(Math.random() * 15) + 75;

      const newDonation: Donation = {
        id: nextDonationId(),
        donorId,
        donorName,
        name: data.name,
        type: data.type,
        category: data.category,
        quantity: data.quantity,
        expiryDate: data.expiryDate,
        photoId: data.photoUrl,
        photoUrl: data.photoUrl,
        storageConditions: data.storageConditions,
        status: 'Cadastrado',
        matchScore,
        matchedNgoId: ngoMatch.id,
        matchedNgoName: ngoMatch.name,
        timestamp: isoNow(),
        urgency: 'media',
        lat: data.lat ?? -23.5505 + (Math.random() - 0.5) * 0.02,
        lng: data.lng ?? -46.6333 + (Math.random() - 0.5) * 0.02,
      };

      state.donations = [newDonation, ...state.donations];

      const donorNotif: Notification = {
        id: nextNotifId(),
        userId: donorId,
        userType: 'donor',
        title: 'Doação Registrada',
        message: `${data.name} (${data.quantity}) cadastrado com sucesso. Em análise para matching.`,
        timestamp: isoNow(),
        read: false,
        category: 'status',
        relatedDonationId: newDonation.id,
      };
      state.notifications = [donorNotif, ...state.notifications];

      const expiryDate = new Date(data.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        const urgencyLabel = diffDays <= 0 ? 'vence HOJE' : diffDays === 1 ? 'vence em 1 dia' : `vence em ${diffDays} dias`;
        const expiryNotif: Notification = {
          id: nextNotifId(),
          userId: ngoMatch.id,
          userType: 'ngo',
          title: `Alerta de Vencimento - ${data.name}`,
          message: `Doação de ${data.name} (${data.quantity}) do ${donorName} ${urgencyLabel}. Prioridade máxima de coleta.`,
          timestamp: isoNow(),
          read: false,
          category: 'expiry',
          relatedDonationId: newDonation.id,
        };
        state.notifications = [expiryNotif, ...state.notifications];
      }

      const auditLog: AuditLog = {
        id: nextLogId(),
        donationName: data.name,
        donationId: newDonation.id,
        fromStatus: '-',
        toStatus: 'Cadastrado',
        actor: donorName,
        notes: `Doação registrada via portal. Categoria: ${data.category}.`,
        timestamp: isoNow(),
      };
      state.auditLogs = [auditLog, ...state.auditLogs];

      emit();
      return newDonation;
    },

    updateDonationState(donationId: string, nextState: DonationStatus, notes?: string) {
      const donation = state.donations.find(d => d.id === donationId);
      if (!donation) return;

      const prevStatus = donation.status;
      donation.status = nextState;
      state.donations = [...state.donations];

      const actor = state.currentUser?.name || 'Sistema';

      const auditLog: AuditLog = {
        id: nextLogId(),
        donationName: donation.name,
        donationId: donation.id,
        fromStatus: prevStatus,
        toStatus: nextState,
        actor,
        notes: notes || '',
        timestamp: isoNow(),
      };
      state.auditLogs = [auditLog, ...state.auditLogs];

      let notifTitle = '';
      let notifMessage = '';
      if (nextState === 'Coletado') {
        notifTitle = 'Coleta Realizada';
        notifMessage = `${donation.name} (${donation.quantity}) coletado por ${actor}.`;
      } else if (nextState === 'Confirmado') {
        notifTitle = 'Recebimento Confirmado';
        notifMessage = `${donation.name} (${donation.quantity}) confirmado como recebido.`;
      } else if (nextState === 'Cancelado') {
        notifTitle = 'Doação Cancelada';
        notifMessage = `${donation.name} foi cancelada por ${actor}.`;
      }

      if (notifTitle) {
        const notif: Notification = {
          id: nextNotifId(),
          userId: donation.donorId,
          userType: 'donor',
          title: notifTitle,
          message: notifMessage,
          timestamp: isoNow(),
          read: false,
          category: 'status',
          relatedDonationId: donation.id,
        };
        state.notifications = [notif, ...state.notifications];
      }

      emit();
    },

    triggerExpiryAlerts(): number {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let triggered = 0;

      state.donations.forEach(donation => {
        const expiry = new Date(donation.expiryDate);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 3) {
          const urgencyLabel = diffDays <= 0 ? 'vence HOJE' : diffDays === 1 ? 'vence em 1 dia' : `vence em ${diffDays} dias`;
          const severity = diffDays <= 0 ? 'CRÍTICO' : diffDays <= 2 ? 'ALTO' : 'MÉDIO';

          const notif: Notification = {
            id: nextNotifId(),
            userId: donation.matchedNgoId || 'ngo_1',
            userType: 'ngo',
            title: `[${severity}] Alerta de Vencimento - ${donation.name}`,
            message: `Doação de ${donation.name} (${donation.quantity}) do ${donation.donorName} ${urgencyLabel}. Prioridade máxima de coleta.`,
            timestamp: isoNow(),
            read: false,
            category: 'expiry',
            relatedDonationId: donation.id,
          };
          state.notifications = [notif, ...state.notifications];

          const donorNotif: Notification = {
            id: nextNotifId(),
            userId: donation.donorId,
            userType: 'donor',
            title: `[${severity}] Sua doação está vencendo - ${donation.name}`,
            message: `Sua doação de ${donation.name} (${donation.quantity}) ${urgencyLabel}. Entre em contato com a ONG para agilizar a coleta.`,
            timestamp: isoNow(),
            read: false,
            category: 'expiry',
            relatedDonationId: donation.id,
          };
          state.notifications = [donorNotif, ...state.notifications];

          triggered += 2;
        }
      });

      emit();
      return triggered;
    },

    markNotificationRead(notifId: string) {
      const notif = state.notifications.find(n => n.id === notifId);
      if (notif) {
        notif.read = true;
        state.notifications = [...state.notifications];
        emit();
      }
    },

    adjustWeights(newWeights: { urgency: number; demand: number; distance: number }) {
      state.weights = { ...newWeights };
      emit();
    },

    retrainModels() {
      state.mlModelsRetrainedDate = isoNow();
      const notif: Notification = {
        id: nextNotifId(),
        userId: 'admin',
        userType: 'admin',
        title: 'Modelos Retreinados',
        message: 'Retreinamento forçado concluído. Random Forest (Urgência) e statsforecast (Demanda) atualizados com dados recentes.',
        timestamp: isoNow(),
        read: false,
        category: 'system',
      };
      state.notifications = [notif, ...state.notifications];
      emit();
    },
  };
}
