// Máscaras para inputs brasileiros (CNPJ, CPF, telefone, CEP)

/** Aplica máscara de CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Aplica máscara de CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Detecta se o tamanho do input é CNPJ (>11 dígitos) ou CPF, aplica máscara certa */
export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 11 ? maskCNPJ(digits) : maskCPF(digits);
}

/** Aplica máscara de telefone: (11) 99999-9999 ou (11) 9999-9999 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    // Fixo: (11) 1234-5678
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  // Celular: (11) 91234-5678
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/** Aplica máscara de CEP: 00000-000 */
export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
}

/** Validação leve (não-confiável, mas filtra erros grosseiros).
 *  Para validação real de CPF/CNPJ precisa de dígito verificador. */
export function isValidCpfCnpjFormat(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
  if (digits.length === 14) return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value);
  return false;
}

export function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10;
}

export function isValidCEP(value: string): boolean {
  return value.replace(/\D/g, '').length === 8;
}
