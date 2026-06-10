const API_BASE = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.EXPO_PUBLIC_API_URL || '');

export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) {
    // Se URL absoluta, substituir host pelo atual (funciona em qualquer porta)
    try {
      const parsed = new URL(url);
      return `${API_BASE}${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}
