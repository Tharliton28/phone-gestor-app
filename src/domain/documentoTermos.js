import { TERMO_OS_PADRAO, TERMO_OS_SAIDA_PADRAO } from './osTermo';

export { TERMO_OS_PADRAO, TERMO_OS_SAIDA_PADRAO };

export const TERMO_GARANTIA_PADRAO = `TERMO DE GARANTIA E CONDIÇÕES DE COMPRA

Cláusula 1ª: O comprador [NOME_CLIENTE], inscrito sob o CPF [CPF_CLIENTE], está adquirindo o produto descrito acima em plenas condições de uso, mediante valor e forma de pagamento ajustados com a empresa [NOME_EMPRESA].

Cláusula 2ª: Por tratar-se de um aparelho seminovo, todas as informações foram repassadas pelo vendedor [NOME_VENDEDOR] na data [DATA_VENDA].

Cláusula 3ª (DO PRAZO): A garantia será de 90 dias para defeitos de fabricação (placa), contados a partir da data de recebimento do produto. A [NOME_EMPRESA] não garante a vedação contra água do aparelho.

Cláusula 4ª (PERDA DE GARANTIA): A garantia cessará imediatamente em caso de danos físicos, contato com líquidos, ou rompimento do selo de garantia.

Cláusula 5ª (DADOS E CONSULTAS): O comprador autoriza a loja a tratar dados cadastrais e, quando necessário à segurança da operação, consultar CPF/CNPJ e/ou IMEI em bases públicas (Receita Federal, Anatel/Celular Legal), nos termos da LGPD.`;

/** Detecta se o texto já traz cláusula de consultas cadastrais/IMEI (LGPD). */
export function termoTemClausulaConsulta(texto) {
  const t = String(texto || '').toLowerCase();
  if (!t.trim()) return false;
  const temConsulta = t.includes('consulta') && (t.includes('cadastr') || t.includes('cpf') || t.includes('imei'));
  const temAnatelOuLgpd = t.includes('anatel') || t.includes('lgpd') || t.includes('celular legal');
  return temConsulta && temAnatelOuLgpd;
}

export function diagnosticoTermosConsulta({ termoOS, termoOSSaida, termoGarantia } = {}) {
  return {
    osEntradaOk: termoTemClausulaConsulta(termoOS),
    osSaidaOk: termoTemClausulaConsulta(termoOSSaida),
    garantiaOk: termoTemClausulaConsulta(termoGarantia),
  };
}
