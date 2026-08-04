/**
 * Catálogo de planos — espelho da landing e da migration 025.
 * Gateway futuro só muda status/origem; limites ficam aqui + no SQL.
 */

export const PLANOS = {
  essencial: {
    id: 'essencial',
    label: 'Essencial',
    precoHint: 'R$ 97/mês',
    maxUsuarios: 2,
    podeNfce: false,
    podeConsultas: false,
    podeMultiLoja: false,
    destaques: [
      'PDV + estoque por IMEI',
      'OS com evidências',
      'Orçamentos e financeiro',
      'Até 2 usuários',
    ],
  },
  profissional: {
    id: 'profissional',
    label: 'Profissional',
    precoHint: 'R$ 197/mês',
    maxUsuarios: 5,
    podeNfce: true,
    podeConsultas: false,
    podeMultiLoja: false,
    destaques: [
      'Tudo do Essencial',
      'NFC-e no PDV',
      'Até 5 usuários',
      'Painel fiscal',
    ],
  },
  rede: {
    id: 'rede',
    label: 'Rede',
    precoHint: 'Sob consulta',
    maxUsuarios: 25,
    podeNfce: true,
    podeConsultas: true,
    podeMultiLoja: true,
    destaques: [
      'Tudo do Profissional',
      'Multi-loja (roadmap)',
      'Consultas CPF/IMEI (API)',
      'Até 25 usuários',
    ],
  },
};

export const PLANOS_IDS = Object.keys(PLANOS);

export const ASSINATURA_STATUS_ATIVOS = ['trial', 'ativa'];

/** Dias de trial no onboarding self-serve (espelho da migration 028). */
export const TRIAL_DIAS = 14;

export function normalizarPlano(plano) {
  if (plano && PLANOS[plano]) return plano;
  return 'essencial';
}

export function getPlanoDef(plano) {
  return PLANOS[normalizarPlano(plano)];
}

/**
 * Vigência comercial: status ativo e, se houver data, ainda dentro do prazo.
 * @param {string} status
 * @param {string|Date|null} [expiraEm]
 */
export function assinaturaEstaAtiva(status, expiraEm = null) {
  if (!ASSINATURA_STATUS_ATIVOS.includes(status)) return false;
  if (!expiraEm) return true;
  const fim = expiraEm instanceof Date ? expiraEm : new Date(expiraEm);
  if (Number.isNaN(fim.getTime())) return true;
  return fim.getTime() > Date.now();
}

export function entitlementsDoPlano(plano, status = 'ativa', extras = {}) {
  const def = getPlanoDef(plano);
  const ativa = assinaturaEstaAtiva(status, extras.expiraEm ?? null);
  const usuariosAtivos = Number(extras.usuariosAtivos) || 0;

  return {
    plano: def.id,
    label: def.label,
    precoHint: def.precoHint,
    assinaturaStatus: status,
    assinaturaExpiraEm: extras.expiraEm ?? null,
    assinaturaAtiva: ativa,
    maxUsuarios: def.maxUsuarios,
    usuariosAtivos,
    podeAdicionarUsuario: ativa && usuariosAtivos < def.maxUsuarios,
    podeNfce: ativa && def.podeNfce,
    podeConsultas: ativa && def.podeConsultas,
    podeMultiLoja: ativa && def.podeMultiLoja,
    destaques: def.destaques,
  };
}

export function mensagemUpgradeNfce(plano) {
  const atual = getPlanoDef(plano).label;
  return `NFC-e está no plano Profissional. Sua loja está no ${atual}. Fale conosco para fazer upgrade.`;
}

export function mensagemConsultaIndisponivel({ podeConsultas = false } = {}) {
  if (!podeConsultas) {
    return 'Consulta CPF/CNPJ e IMEI entram no plano Rede, com API real. Ainda não está ligada — não debitamos créditos.';
  }
  return 'A API de consulta ainda não está ligada. Quando estiver, consumirá créditos da carteira.';
}
