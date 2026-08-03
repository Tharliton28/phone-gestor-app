import { roundMoney } from '../utils/formatters';

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseVendaDate(venda) {
  const raw = venda?.data_venda || venda?.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Série dos últimos N dias (inclui hoje) com faturamento e qtd de vendas concluídas.
 */
export function serieVendasDiarias(vendas = [], dias = 7, referencia = new Date()) {
  const fim = startOfLocalDay(referencia);
  const mapa = new Map();

  for (let i = dias - 1; i >= 0; i -= 1) {
    const dia = new Date(fim);
    dia.setDate(fim.getDate() - i);
    const key = toDayKey(dia);
    mapa.set(key, {
      key,
      label: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      faturamento: 0,
      quantidade: 0,
    });
  }

  for (const venda of vendas) {
    if (venda.status !== 'concluido') continue;
    const data = parseVendaDate(venda);
    if (!data) continue;
    const key = toDayKey(startOfLocalDay(data));
    const bucket = mapa.get(key);
    if (!bucket) continue;
    bucket.quantidade += 1;
    bucket.faturamento = roundMoney(bucket.faturamento + Number(venda.valor_total || 0));
  }

  return Array.from(mapa.values());
}

export function topVendedoresChart(vendas = [], limite = 5) {
  const map = {};

  for (const venda of vendas) {
    if (venda.status !== 'concluido') continue;
    const nome = venda.vendedor?.nome ?? 'Sem vendedor';
    if (!map[nome]) map[nome] = { nome, total: 0, quantidade: 0 };
    map[nome].quantidade += 1;
    map[nome].total = roundMoney(map[nome].total + Number(venda.valor_total || 0));
  }

  return Object.values(map)
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}
