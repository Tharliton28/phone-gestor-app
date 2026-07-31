import { describe, expect, it } from 'vitest';
import {
  gerarChaveAcessoMock,
  gerarProtocoloMock,
  rotuloDocumentoFiscal,
  statusFiscalEhSucesso,
} from './nfce';

describe('nfce domain', () => {
  it('rotula documento e reconhece sucesso mock/autorizado', () => {
    expect(rotuloDocumentoFiscal({ tipo: 'nfce', numero: 12 })).toBe('NFCE 12');
    expect(statusFiscalEhSucesso('mock')).toBe(true);
    expect(statusFiscalEhSucesso('autorizado')).toBe(true);
    expect(statusFiscalEhSucesso('rejeitado')).toBe(false);
  });

  it('gera chave e protocolo mock com tamanho esperado', () => {
    const chave = gerarChaveAcessoMock({ serie: 1, numero: 42, agora: new Date('2026-07-31T12:00:00Z') });
    expect(chave).toHaveLength(44);
    expect(gerarProtocoloMock().length).toBeGreaterThanOrEqual(15);
  });
});
