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

function hasAllSameDigits(digits) {
  return /^(\d)\1+$/.test(digits);
}

/** Valida dígitos verificadores do CPF */
export function isValidCpf(digits) {
  if (!digits || digits.length !== 11 || hasAllSameDigits(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

/** Valida dígitos verificadores do CNPJ */
export function isValidCnpj(digits) {
  if (!digits || digits.length !== 14 || hasAllSameDigits(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(digits[i]) * weights1[i];
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== Number(digits[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i += 1) sum += Number(digits[i]) * weights2[i];
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === Number(digits[13]);
}

/** Valida CPF (11) ou CNPJ (14). Vazio é permitido. */
export function validateCpfCnpj(value) {
  const digits = onlyDigits(value);
  if (!digits) return { valid: true, digits: null, message: null };

  if (digits.length === 11) {
    if (!isValidCpf(digits)) {
      return { valid: false, digits, message: 'CPF inválido. Verifique os dígitos informados.' };
    }
    return { valid: true, digits, message: null };
  }

  if (digits.length === 14) {
    if (!isValidCnpj(digits)) {
      return { valid: false, digits, message: 'CNPJ inválido. Verifique os dígitos informados.' };
    }
    return { valid: true, digits, message: null };
  }

  return {
    valid: false,
    digits,
    message: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.',
  };
}

/** Valida telefone brasileiro (10 ou 11 dígitos com DDD) */
export function validateTelefone(value) {
  const digits = onlyDigits(value);
  if (digits.length < 10 || digits.length > 11) {
    return {
      valid: false,
      message: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
    };
  }
  return { valid: true, message: null };
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

/** Formata número como moeda BRL para exibição */
export function formatBRL(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0,00';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte string de moeda pt-BR ou número para decimal */
export function parseMoney(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const str = String(value).trim().replace(/[R$\s]/g, '');
  if (!str) return 0;

  // Formato BR: 1.234,56 ou 3500,00
  if (str.includes(',')) {
    const normalized = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return Number.isNaN(num) ? 0 : num;
  }

  // Ponto decimal (ex.: 3500.00 gerado por toFixed)
  const num = parseFloat(str);
  return Number.isNaN(num) ? 0 : num;
}

/** Arredonda valor monetário para 2 casas (evita erro de ponto flutuante) */
export function roundMoney(value) {
  const num = typeof value === 'number' ? value : parseMoney(value);
  return Math.round(num * 100) / 100;
}

/** Converte para centavos inteiros — padrão de comparação em PDV/ERP */
export function moneyToCents(value) {
  return Math.round(roundMoney(value) * 100);
}
