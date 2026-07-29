import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAXAS_CREDITO_PARCELA,
  mapTaxasCreditoRows,
  resolveTaxaPercentualSim,
} from './taxaCreditoService';
import { FORMA_SIM } from '../domain/orcamentoCalculos';

describe('taxaCreditoService', () => {
  it('mescla taxas da maquininha sobre o padrão da loja', () => {
    const loja = mapTaxasCreditoRows([
      { parcelas: 1, taxa_percentual: 3.5 },
      { parcelas: 12, taxa_percentual: 15 },
    ]);

    const stone = mapTaxasCreditoRows(
      [{ parcelas: 3, taxa_percentual: 5.5 }],
      loja
    );

    expect(stone[1]).toBe(3.5);
    expect(stone[3]).toBe(5.5);
    expect(stone[12]).toBe(15);
  });

  it('usa grade da maquininha no simulador de crédito', () => {
    const taxasStone = { ...DEFAULT_TAXAS_CREDITO_PARCELA, 6: 9.99 };

    const taxa = resolveTaxaPercentualSim({
      formaPagamentoSim: FORMA_SIM.CREDITO,
      parcelas: 6,
      taxasCreditoParcela: taxasStone,
      formaPagamentoCreditoId: 'uuid-stone',
      formasPagamento: [{ id: 'uuid-stone', tipo: 'credito', taxa_percentual: 3.49 }],
    });

    expect(taxa).toBe(9.99);
  });
});
