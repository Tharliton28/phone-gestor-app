/** Formata CNPJ 14 dígitos para exibição */
export function formatCnpj(cnpj) {
  if (!cnpj) return '';
  const digits = String(cnpj).replace(/\D/g, '');
  if (digits.length !== 14) return digits;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Formata CPF ou CNPJ conforme tamanho */
export function formatCpfCnpj(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return formatCnpj(digits);
  }
  return digits;
}

/** Remove tudo que não for dígito */
export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Iniciais do nome (máx. 2 letras) */
export function getInitials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Trunca texto com reticências */
export function truncate(text, max = 40) {
  if (!text || text.length <= max) return text ?? '';
  return `${text.slice(0, max)}…`;
}
