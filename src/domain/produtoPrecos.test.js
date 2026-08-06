import { describe, expect, it } from 'vitest';
import {
  custoBaseProduto,
  formatMargemPercent,
  lucroEstimadoProduto,
  margemApartirDaVenda,
  sincronizarMargemComVenda,
  vendaApartirDaMargem,
} from './produtoPrecos';

describe('produtoPrecos', () => {
  it('soma custo base com extras', () => {
    expect(custoBaseProduto(2800, 50)).toBe(2850);
  });

  it('calcula venda a partir da margem %', () => {
    expect(vendaApartirDaMargem(2800, 0, 30)).toBe(3640);
    expect(vendaApartirDaMargem(100, 0, 0)).toBe(100);
  });

  it('calcula margem % a partir da venda', () => {
    expect(margemApartirDaVenda(2800, 0, 3640)).toBe(30);
    expect(margemApartirDaVenda(2800, 0, 3150)).toBe(12.5);
    expect(margemApartirDaVenda(0, 0, 100)).toBeNull();
  });

  it('estima lucro em R$', () => {
    expect(lucroEstimadoProduto(2800, 0, 3150)).toBe(350);
  });

  it('sincroniza margem a partir de custo+venda (corrige legado)', () => {
    expect(sincronizarMargemComVenda(2800, 0, 3150, '350')).toBe('12.5');
    expect(sincronizarMargemComVenda(0, 0, 0, '30')).toBe('30');
  });

  it('formata margem', () => {
    expect(formatMargemPercent(30)).toBe('30');
    expect(formatMargemPercent(12.5)).toBe('12.5');
  });
});
