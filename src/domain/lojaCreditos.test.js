import { describe, expect, it } from 'vitest';
import {
  CUSTO_CREDITOS,
  formatarSaldoCreditos,
  rotuloLancamento,
  temSaldoSuficiente,
} from './lojaCreditos';

describe('lojaCreditos', () => {
  it('NFC-e custa mais que consulta CPF', () => {
    expect(CUSTO_CREDITOS.nfce_emissao.creditos).toBeGreaterThan(
      CUSTO_CREDITOS.consulta_cpf_cnpj.creditos
    );
  });

  it('valida saldo suficiente', () => {
    expect(temSaldoSuficiente(4, 'nfce_emissao')).toBe(true);
    expect(temSaldoSuficiente(3, 'nfce_emissao')).toBe(false);
  });

  it('formata saldo', () => {
    expect(formatarSaldoCreditos(1)).toBe('1 crédito');
    expect(formatarSaldoCreditos(50)).toBe('50 créditos');
  });

  it('rotula lancamento pelo catalogo', () => {
    expect(rotuloLancamento({ acao: 'consulta_imei' })).toBe('Consulta IMEI');
    expect(rotuloLancamento({ descricao: 'Custom' })).toBe('Custom');
  });
});
