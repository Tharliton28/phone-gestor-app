/**
 * Adapter stub — quando a API real existir, só troca o provider.
 * Hoje nenhuma consulta externa está ligada.
 */

export const CONSULTA_PROVIDER_STATUS = 'unavailable';

export function consultaProviderDisponivel() {
  return CONSULTA_PROVIDER_STATUS === 'ready';
}

export async function consultarDocumento(_documento, _opts = {}) {
  return {
    ok: false,
    provider: 'none',
    error: new Error(
      'Consulta CPF/CNPJ ainda não está ligada. O botão não preenche dados fictícios nem consome créditos.'
    ),
  };
}
