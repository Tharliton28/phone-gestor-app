import { describe, expect, it } from 'vitest';
import { buildFocusNfcePayload, mapFormaPagamentoFocus, validarItensParaNfce } from './nfcePayload';

describe('nfcePayload', () => {
  it('mapeia formas de pagamento Focus', () => {
    expect(mapFormaPagamentoFocus('pix')).toBe('17');
    expect(mapFormaPagamentoFocus('dinheiro')).toBe('01');
    expect(mapFormaPagamentoFocus('credito')).toBe('03');
  });

  it('exige NCM de 8 dígitos', () => {
    expect(validarItensParaNfce([{ descricao: 'iPhone', produto: { ncm: '123' } }])).toHaveLength(1);
    expect(validarItensParaNfce([{ descricao: 'iPhone', produto: { ncm: '85171231' } }])).toHaveLength(0);
  });

  it('monta payload Focus mínimo', () => {
    const payload = buildFocusNfcePayload({
      loja: { cnpj: '12.345.678/0001-23' },
      serie: 1,
      numero: 10,
      agora: new Date('2026-07-31T15:00:00-03:00'),
      venda: {
        valor_total: 100,
        cliente: { nome: 'João', cpf_cnpj: '529.982.247-25' },
        itens: [{
          descricao: 'Capinha',
          quantidade: 1,
          valor_unitario: 100,
          valor_total: 100,
          produto: {
            codigo: 1,
            ncm: '39269090',
            cfop: '5102',
            unidade: 'UN',
            icms_origem: '0',
            icms_situacao_tributaria: '102',
          },
        }],
        pagamentos: [{ valor: 100, forma_tipo: 'pix' }],
      },
    });

    expect(payload.cnpj_emitente).toBe('12345678000123');
    expect(payload.cpf_destinatario).toBe('52998224725');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].codigo_ncm).toBe('39269090');
    expect(payload.formas_pagamento[0].forma_pagamento).toBe('17');
    expect(payload.serie).toBe('1');
    expect(payload.numero).toBe('10');
  });
});
