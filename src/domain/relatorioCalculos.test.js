import { describe, expect, it } from 'vitest';
import {
  calcFunilOrcamentos,
  calcResumoTaxas,
  calcResumoVendas,
  calcVendasPorVendedor,
} from './relatorioCalculos';

describe('relatorioCalculos', () => {
  const vendas = [
    {
      status: 'concluido',
      valor_total: 1000,
      vendedor: { nome: 'Ana' },
      pagamentos: [{
        valor: 1030,
        valor_base: 1000,
        valor_taxa: 30,
        taxa_percentual: 3,
        taxa_repassada: true,
      }],
    },
    {
      status: 'concluido',
      valor_total: 500,
      vendedor: { nome: 'Ana' },
      pagamentos: [{
        valor: 500,
        valor_base: 500,
        valor_taxa: 0,
        taxa_percentual: 0,
        taxa_repassada: false,
      }],
    },
    {
      status: 'cancelada',
      valor_total: 200,
      vendedor: { nome: 'Bob' },
      pagamentos: [],
    },
  ];

  it('resume vendas concluídas', () => {
    const resumo = calcResumoVendas(vendas);
    expect(resumo.quantidade).toBe(2);
    expect(resumo.faturamento).toBe(1500);
    expect(resumo.ticketMedio).toBe(750);
  });

  it('agrupa por vendedor', () => {
    const porVendedor = calcVendasPorVendedor(vendas);
    expect(porVendedor).toHaveLength(1);
    expect(porVendedor[0].vendedor).toBe('Ana');
    expect(porVendedor[0].quantidade).toBe(2);
  });

  it('calcula taxas repassadas vs custo', () => {
    const taxas = calcResumoTaxas(vendas);
    expect(taxas.taxaRepassadaCliente).toBe(30);
    expect(taxas.custoOperadoraEstimado).toBe(30);
    expect(taxas.impactoLiquido).toBe(0);
  });

  it('calcula funil de orçamentos', () => {
    const funil = calcFunilOrcamentos([
      { status: 'pendente', valor_total: 100 },
      { status: 'convertido', valor_total: 200 },
      { status: 'expirado', valor_total: 50 },
    ]);

    expect(funil.total).toBe(3);
    expect(funil.contagem.convertido).toBe(1);
    expect(funil.taxaConversao).toBe(33.33);
    expect(funil.valorConvertido).toBe(200);
  });
});
