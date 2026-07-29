import { describe, expect, it } from 'vitest';
import {
  deveExpirarOrcamento,
  isDataValidadeExpirada,
  podeAprovarOrcamento,
  podeConverterOrcamento,
  podeEditarOrcamento,
  podeExcluirOrcamento,
} from './orcamentoStatus';

const ONTEM = '2026-07-28';
const HOJE = '2026-07-29';
const AMANHA = '2026-07-30';

describe('orcamentoStatus', () => {
  it('validade de hoje ainda é válida', () => {
    expect(isDataValidadeExpirada(HOJE, new Date(`${HOJE}T15:00:00`))).toBe(false);
  });

  it('validade de ontem está expirada', () => {
    expect(isDataValidadeExpirada(ONTEM, new Date(`${HOJE}T12:00:00`))).toBe(true);
  });

  it('pendente vencido deve expirar', () => {
    expect(deveExpirarOrcamento('pendente', ONTEM, new Date(`${HOJE}T12:00:00`))).toBe(true);
    expect(deveExpirarOrcamento('aprovado', ONTEM, new Date(`${HOJE}T12:00:00`))).toBe(true);
    expect(deveExpirarOrcamento('convertido', ONTEM, new Date(`${HOJE}T12:00:00`))).toBe(false);
  });

  it('bloqueia ações em orçamento expirado', () => {
    const ref = new Date(`${HOJE}T12:00:00`);
    expect(podeEditarOrcamento('pendente', ONTEM, ref)).toBe(false);
    expect(podeAprovarOrcamento('pendente', ONTEM, ref)).toBe(false);
    expect(podeConverterOrcamento('aprovado', ONTEM, ref)).toBe(false);
    expect(podeExcluirOrcamento('expirado')).toBe(true);
  });

  it('permite converter orçamento aprovado dentro da validade', () => {
    expect(podeConverterOrcamento('aprovado', AMANHA, new Date(`${HOJE}T12:00:00`))).toBe(true);
    expect(podeEditarOrcamento('pendente', AMANHA, new Date(`${HOJE}T12:00:00`))).toBe(true);
  });
});
