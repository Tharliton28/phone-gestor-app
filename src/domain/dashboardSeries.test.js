import { describe, expect, it } from 'vitest';
import { serieVendasDiarias, topVendedoresChart } from './dashboardSeries';

describe('dashboardSeries', () => {
  const ref = new Date(2026, 7, 3); // 3 ago 2026

  it('preenche 7 dias mesmo sem vendas', () => {
    const serie = serieVendasDiarias([], 7, ref);
    expect(serie).toHaveLength(7);
    expect(serie[0].label).toBe('28/07');
    expect(serie[6].label).toBe('03/08');
    expect(serie.every((d) => d.faturamento === 0)).toBe(true);
  });

  it('agrega só vendas concluídas no dia certo', () => {
    const vendas = [
      { status: 'concluido', valor_total: 100, data_venda: '2026-08-03T12:00:00' },
      { status: 'concluido', valor_total: 50, data_venda: '2026-08-03T18:00:00' },
      { status: 'cancelado', valor_total: 999, data_venda: '2026-08-03T10:00:00' },
      { status: 'concluido', valor_total: 200, data_venda: '2026-08-01T10:00:00' },
    ];
    const serie = serieVendasDiarias(vendas, 7, ref);
    const hoje = serie.find((d) => d.key === '2026-08-03');
    const dia01 = serie.find((d) => d.key === '2026-08-01');
    expect(hoje.quantidade).toBe(2);
    expect(hoje.faturamento).toBe(150);
    expect(dia01.faturamento).toBe(200);
  });

  it('ordena top vendedores', () => {
    const top = topVendedoresChart([
      { status: 'concluido', valor_total: 100, vendedor: { nome: 'Ana' } },
      { status: 'concluido', valor_total: 300, vendedor: { nome: 'Bruno' } },
      { status: 'concluido', valor_total: 50, vendedor: { nome: 'Ana' } },
    ], 2);
    expect(top[0].nome).toBe('Bruno');
    expect(top[1].nome).toBe('Ana');
    expect(top[1].total).toBe(150);
  });
});
