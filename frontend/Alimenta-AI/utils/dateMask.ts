// Utilitários de data DD/MM/AAAA ↔ ISO
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let result = '';
  for (let i = 0; i < digits.length && i < 8; i++) {
    if (i === 2 || i === 4) result += '/';
    result += digits[i];
  }
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