import { describe, expect, it } from 'vitest';
import {
  assinaturaEstaAtiva,
  entitlementsDoPlano,
  getPlanoDef,
  mensagemConsultaIndisponivel,
  mensagemUpgradeNfce,
  normalizarPlano,
} from './lojaPlanos';

describe('lojaPlanos', () => {
  it('normaliza plano inválido para essencial', () => {
    expect(normalizarPlano(null)).toBe('essencial');
    expect(normalizarPlano('xyz')).toBe('essencial');
  });

  it('limites batem com a landing', () => {
    expect(getPlanoDef('essencial').maxUsuarios).toBe(2);
    expect(getPlanoDef('profissional').maxUsuarios).toBe(5);
    expect(getPlanoDef('essencial').podeNfce).toBe(false);
    expect(getPlanoDef('profissional').podeNfce).toBe(true);
    expect(getPlanoDef('profissional').podeConsultas).toBe(true);
    expect(getPlanoDef('rede').podeConsultas).toBe(true);
  });

  it('assinatura suspensa bloqueia features', () => {
    const e = entitlementsDoPlano('profissional', 'suspensa', { usuariosAtivos: 1 });
    expect(assinaturaEstaAtiva('suspensa')).toBe(false);
    expect(e.podeNfce).toBe(false);
    expect(e.podeAdicionarUsuario).toBe(false);
  });

  it('trial expirado bloqueia mesmo com status trial', () => {
    const ontem = new Date(Date.now() - 86400000).toISOString();
    expect(assinaturaEstaAtiva('trial', ontem)).toBe(false);
    const e = entitlementsDoPlano('essencial', 'trial', { usuariosAtivos: 1, expiraEm: ontem });
    expect(e.assinaturaAtiva).toBe(false);
  });

  it('trial vigente libera acesso', () => {
    const amanha = new Date(Date.now() + 86400000).toISOString();
    expect(assinaturaEstaAtiva('trial', amanha)).toBe(true);
  });

  it('essencial com 2 usuários não adiciona mais', () => {
    const e = entitlementsDoPlano('essencial', 'ativa', { usuariosAtivos: 2 });
    expect(e.podeAdicionarUsuario).toBe(false);
  });

  it('mensagens honestas de upgrade/consulta', () => {
    expect(mensagemUpgradeNfce('essencial')).toMatch(/Profissional/);
    expect(mensagemConsultaIndisponivel({ podeConsultas: false })).toMatch(/Profissional/);
    expect(mensagemConsultaIndisponivel({ podeConsultas: true })).toMatch(/Secrets|configurada/i);
  });
});
