const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}
