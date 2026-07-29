import { describe, expect, it } from 'vitest';
import { substituirVariaveisTermo } from './osTermo';

describe('osTermo', () => {
  it('substitui variáveis do termo de OS', () => {
    const texto = 'Cliente [NOME_CLIENTE] entrega [MODELO_APARELHO] — OS [CODIGO_OS].';
    const result = substituirVariaveisTermo(texto, {
      nomeCliente: 'Ana Silva',
      modeloAparelho: 'iPhone 14',
      codigoOs: 'OS-0001',
    });

    expect(result).toBe('Cliente Ana Silva entrega iPhone 14 — OS OS-0001.');
  });
});
