/** Status DB que ainda podem ser marcados como expirados automaticamente */
export const STATUS_EXPIRAVEL = ['pendente', 'aprovado'];

export function isDataValidadeExpirada(dataValidade, referencia = new Date()) {
  if (!dataValidade) return false;
  const hoje = referencia.toISOString().slice(0, 10);
  return String(dataValidade).slice(0, 10) < hoje;
}

export function deveExpirarOrcamento(status, dataValidade, referencia = new Date()) {
  return STATUS_EXPIRAVEL.includes(status) && isDataValidadeExpirada(dataValidade, referencia);
}

export function podeEditarOrcamento(status, dataValidade, referencia = new Date()) {
  return status === 'pendente' && !isDataValidadeExpirada(dataValidade, referencia);
}

export function podeAprovarOrcamento(status, dataValidade, referencia = new Date()) {
  return status === 'pendente' && !isDataValidadeExpirada(dataValidade, referencia);
}

export function podeRejeitarOrcamento(status, dataValidade, referencia = new Date()) {
  return status === 'pendente' && !isDataValidadeExpirada(dataValidade, referencia);
}

export function podeConverterOrcamento(status, dataValidade, referencia = new Date()) {
  return status === 'aprovado' && !isDataValidadeExpirada(dataValidade, referencia);
}

export function podeExcluirOrcamento(status) {
  return ['pendente', 'rejeitado', 'expirado'].includes(status);
}
