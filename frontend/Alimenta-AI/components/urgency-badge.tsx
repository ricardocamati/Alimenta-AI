import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

export type UrgencyLevel = 'baixa' | 'media' | 'alta' | 'critica';

type UrgencyBadgeProps = {
  urgency: UrgencyLevel | string;
  compact?: boolean;
};

type UrgencyConfig = {
  label: string;
  shortLabel: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  baixa: {
    label: 'Baixa',
    shortLabel: 'BAIXA',
    backgroundColor: '#e8f5e9',
    textColor: '#2e7d32',
    borderColor: '#a5d6a7',
  },
  media: {
    label: 'Média',
    shortLabel: 'MÉDIA',
    backgroundColor: '#fff8e1',
    textColor: '#f57c00',
    borderColor: '#ffd54f',
  },
  alta: {
    label: 'Alta',
    shortLabel: 'ALTA',
    backgroundColor: '#fff3e0',
    textColor: '#ef6c00',
    borderColor: '#ffb74d',
  },
  critica: {
    label: 'Crítica',
    shortLabel: 'CRÍTICA',
    backgroundColor: '#ffebee',
    textColor: '#c62828',
    borderColor: '#ef9a9a',
  },
};

function normalizeUrgency(urgency: string): UrgencyLevel {
  const normalized = urgency.trim().toLowerCase();

  switch (normalized) {
    case 'baixa':
    case 'baixo':
    case 'low':
      return 'baixa';
    case 'media':
    case 'média':
    case 'medio':
    case 'médio':
    case 'medium':
      return 'media';
    case 'alta':
    case 'high':
      return 'alta';
    case 'critica':
    case 'crítica':
    case 'critical':
      return 'critica';
    default:
      return 'media';
  }
}

export function UrgencyBadge({ urgency, compact = false }: UrgencyBadgeProps) {
  const key = normalizeUrgency(String(urgency));
  const config = URGENCY_CONFIG[key];

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor, borderColor: config.borderColor }]}>
      <View style={[styles.dot, { backgroundColor: config.textColor }]} />
      <ThemedText type="code" style={[styles.text, { color: config.textColor }]}> 
        {compact ? config.shortLabel : config.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
});