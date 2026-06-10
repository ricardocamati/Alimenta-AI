// Utilitários de data DD/MM/AAAA ↔ ISO
export function formatDateInput(raw: string): string {
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, '');
  let result = '';
  if (digits.length >= 2) result = digits.slice(0, 2);
  if (digits.length >= 4) result += '/' + digits.slice(2, 4);
  if (digits.length >= 8) result += '/' + digits.slice(4, 8);
  return result;
}

export function parseBRDate(value: string): string | null {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

export function toDisplayDate(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}