import { describe, expect, it } from 'vitest';
import { buildLojaUpdatePayload, mapLojaToEmpresaForm } from './lojaService';

describe('lojaService', () => {
  it('mapLojaToEmpresaForm preenche campos da loja', () => {
    const form = mapLojaToEmpresaForm({
      razao_social: 'Loja Teste LTDA',
      nome_fantasia: 'Loja Teste',
      cnpj: '64951713000113',
      cidade: 'Maracanaú',
      estado: 'ce',
      cep: '61900540',
    });

    expect(form.razaoSocial).toBe('Loja Teste LTDA');
    expect(form.cnpj).toBe('64.951.713/0001-13');
    expect(form.estado).toBe('CE');
    expect(form.cep).toBe('61900-540');
  });

  it('buildLojaUpdatePayload exige razão, CNPJ e cidade', () => {
    const bad = buildLojaUpdatePayload({
      razaoSocial: '',
      cnpj: '123',
      cidade: '',
    });
    expect(bad.error).toBeTruthy();

    const ok = buildLojaUpdatePayload({
      razaoSocial: 'Loja OK',
      cnpj: '64.951.713/0001-13',
      cidade: 'Fortaleza',
      estado: 'CE',
      cep: '60000-000',
    });
    expect(ok.error).toBeNull();
    expect(ok.payload.cnpj).toBe('64951713000113');
    expect(ok.payload.cep).toBe('60000000');
    expect(ok.payload.estado).toBe('CE');
  });
});
