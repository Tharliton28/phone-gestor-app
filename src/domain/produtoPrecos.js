import { parseMoney, roundMoney } from '../utils/formatters';

/** Custo + frete/taxas extras. */
export function custoBaseProduto(custo, extras = 0) {
  return roundMoney(parseMoney(custo) + parseMoney(extras));
}

/** Venda = base × (1 + margem%/100). */
export function vendaApartirDaMargem(custo, extras, margemPct) {
  const base = custoBaseProduto(custo, extras);
  const m = Number(margemPct);
  if (!Number.isFinite(m)) return base;
  return roundMoney(base * (1 + m / 100));
}

/**
 * Margem % a partir da venda.
 * @returns {number|null} null se base <= 0
 */
export function margemApartirDaVenda(custo, extras, venda) {
  const base = custoBaseProduto(custo, extras);
  const v = parseMoney(venda);
  if (base <= 0) return null;
  return roundMoney(((v - base) / base) * 100);
}

export function lucroEstimadoProduto(custo, extras, venda) {
  return roundMoney(parseMoney(venda) - custoBaseProduto(custo, extras));
}

/**
 * Fonte da verdade: custo + venda.
 * Recalcula a margem % quando ambos existem (evita lixo legado tipo lucro R$ no campo %).
 */
export function sincronizarMargemComVenda(custo, extras, venda, margemAtual = '') {
  const base = custoBaseProduto(custo, extras);
  const v = parseMoney(venda);
  if (base > 0 && v > 0) {
    return formatMargemPercent(margemApartirDaVenda(custo, extras, v));
  }
  return margemAtual == null ? '' : String(margemAtual);
}

/** Exibe margem com até 2 casas, sem zeros inúteis. */
export function formatMargemPercent(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(roundMoney(n));
}
