import { describe, expect, it } from 'vitest';
import {
  assinaturaEstaAtiva,
  entitlementsDoPlano,
  getPlanoDef,
  mensagemConsultaIndisponivel,
  mensagemTrialConsultaLimite,
  mensagemUpgradeNfce,
  normalizarCiclo,
  normalizarPlano,
  precoAnualCheioHint,
  precoCheckout,
  precoHintCiclo,
  rotuloTrialConsultas,
  TRIAL_LIMITE_CONSULTA_CPF_CNPJ,
  TRIAL_LIMITE_CONSULTA_IMEI,
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

  it('anual = 10× mensal (2 meses grátis)', () => {
    expect(normalizarCiclo('anual')).toBe('anual');
    expect(normalizarCiclo('xyz')).toBe('mensal');
    expect(precoCheckout('essencial', 'mensal')).toBe(97);
    expect(precoCheckout('essencial', 'anual')).toBe(970);
    expect(precoCheckout('profissional', 'anual')).toBe(1970);
    expect(precoHintCiclo('essencial', 'anual')).toMatch(/970/);
    expect(precoAnualCheioHint('essencial')).toContain('1');
    expect(getPlanoDef('essencial').precoMensal * 12).toBe(1164);
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

  it('cotas e mensagens do trial de consultas', () => {
    expect(TRIAL_LIMITE_CONSULTA_CPF_CNPJ).toBe(3);
    expect(TRIAL_LIMITE_CONSULTA_IMEI).toBe(2);
    expect(mensagemTrialConsultaLimite('cpf_cnpj')).toMatch(/3/);
    expect(mensagemTrialConsultaLimite('imei')).toMatch(/2/);
    expect(
      rotuloTrialConsultas({
        ativo: true,
        cpf_cnpj_usados: 1,
        cpf_cnpj_limite: 3,
        imei_usados: 0,
        imei_limite: 2,
      })
    ).toMatch(/restam 2.*CPF/);
  });
});
