import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return {
    text: colors.text,
    textSecondary: colors.icon,
    background: colors.background,
    backgroundElement: scheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
    backgroundSelected: scheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
    tint: colors.tint,
  };
}
