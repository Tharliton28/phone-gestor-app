import { describe, expect, it } from 'vitest';
import {
  isStatusTerminal,
  podeAlterarStatusKanban,
  podeMoverPara,
  transicoesPermitidas,
} from './osStatus';

describe('osStatus', () => {
  it('identifica status terminal', () => {
    expect(isStatusTerminal('finalizada')).toBe(true);
    expect(isStatusTerminal('cancelada')).toBe(true);
    expect(isStatusTerminal('aberta')).toBe(false);
  });

  it('permite alteração apenas em OS ativas', () => {
    expect(podeAlterarStatusKanban('em_manutencao')).toBe(true);
    expect(podeAlterarStatusKanban('finalizada')).toBe(false);
    expect(podeAlterarStatusKanban('cancelada')).toBe(false);
  });

  it('lista transições a partir de aberta', () => {
    expect(transicoesPermitidas('aberta')).toEqual([
      'em_manutencao',
      'aguardando_peca',
      'finalizada',
      'cancelada',
    ]);
  });

  it('bloqueia movimentação a partir de status terminal', () => {
    expect(podeMoverPara('finalizada', 'aberta')).toBe(false);
    expect(podeMoverPara('em_manutencao', 'aguardando_peca')).toBe(true);
    expect(podeMoverPara('em_manutencao', 'finalizada')).toBe(true);
  });
});
