import { describe, expect, it } from 'vitest';
import {
  buildPagamentosPdvFromOrcamento,
  calcItemLinhaOrcamento,
  calcParcelasDistribuidas,
  calcSimulacaoOrcamento,
  FORMA_SIM,
} from './orcamentoCalculos';
import { parseMoney } from '../utils/formatters';

describe('orcamentoCalculos', () => {
  it('calcula linha com desconto: 3 × R$ 3.000 − R$ 175 = R$ 8.825', () => {
    expect(calcItemLinhaOrcamento(3, 3000, 175)).toBe(8825);
  });

  it('simula crédito 3x com 5% sobre o restante (cenário real da loja)', () => {
    const sim = calcSimulacaoOrcamento({
      itens: [{ quantidade: 3, preco: 3000, desconto: 175 }],
      formaPagamentoSim: FORMA_SIM.CREDITO,
      parcelas: 3,
      adicionarTaxa: true,
      taxaPercentual: 5,
    });

    expect(sim.valorSubtotalLiquido).toBe(8825);
    expect(sim.valorRestanteBase).toBe(8825);
    expect(sim.valorTaxa).toBe(441.25);
    expect(sim.valorTotal).toBe(9266.25);
    expect(sim.parcelamento.parcelas).toBe(3);
    expect(sim.parcelamento.valorParcela).toBe(3088.75);
    expect(sim.parcelamento.valoresParcelas.reduce((a, b) => a + b, 0)).toBe(9266.25);
  });

  it('aplica taxa somente sobre o restante após entrada e aparelho na troca', () => {
    const sim = calcSimulacaoOrcamento({
      itens: [{ quantidade: 1, preco: 5000, desconto: 0 }],
      entrada: 1000,
      aparelhosTroca: [{ valor: 800 }],
      formaPagamentoSim: FORMA_SIM.CREDITO,
      parcelas: 2,
      adicionarTaxa: true,
      taxaPercentual: 10,
    });

    expect(sim.valorSubtotalLiquido).toBe(5000);
    expect(sim.valorRestanteBase).toBe(3200);
    expect(sim.valorTaxa).toBe(320);
    expect(sim.valorTotal).toBe(5320);
  });

  it('distribui centavos na última parcela', () => {
    const { valoresParcelas } = calcParcelasDistribuidas(100, 3);

    expect(valoresParcelas).toEqual([33.33, 33.33, 33.34]);
    expect(valoresParcelas.reduce((acc, v) => acc + v, 0)).toBe(100);
  });

  it('monta pagamentos do PDV com total fechado — sem retaxar', () => {
    const orcamento = {
      valor_subtotal: 9000,
      valor_desconto: 175,
      valor_acrescimo: 441.25,
      valor_total: 9266.25,
      valor_entrada: 0,
      valor_restante_sim: 8825,
      forma_pagamento_sim: FORMA_SIM.CREDITO,
      parcelas_sim: 3,
      taxa_repassada: true,
      taxa_percentual: 5,
      aparelhos: [],
    };

    const { pagamentos, simulacao } = buildPagamentosPdvFromOrcamento(orcamento, [
      { id: 'cred-1', nome: 'Crédito Parcelado 12x', tipo: 'credito', taxa_percentual: 12.99 },
    ]);

    const totalPago = pagamentos.reduce((acc, pag) => acc + parseMoney(pag.valor), 0);

    expect(simulacao.valorTotal).toBe(9266.25);
    expect(totalPago).toBe(9266.25);

    const linhaCredito = pagamentos.find((pag) => pag.formaTipo === 'credito');
    expect(linhaCredito.valorBase).toBe(8825);
    expect(linhaCredito.valorTaxa).toBe(441.25);
    expect(linhaCredito.valor).toBe(9266.25);
    expect(linhaCredito.taxaRepassada).toBe(true);
  });
});
