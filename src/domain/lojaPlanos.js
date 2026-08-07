/**
 * Catálogo de planos — espelho da landing e da migration 025.
 * Gateway futuro só muda status/origem; limites ficam aqui + no SQL.
 *
 * Preço anual = 10× mensal (2 meses grátis ≈ 16,7%), padrão SaaS B2B.
 */

export const PLANOS = {
  essencial: {
    id: 'essencial',
    label: 'Essencial',
    precoHint: 'R$ 97/mês',
    precoMensal: 97,
    precoAnual: 970,
    checkoutDisponivel: true,
    maxUsuarios: 2,
    podeNfce: false,
    podeConsultas: false,
    podeMultiLoja: false,
    destaques: [
      'PDV + estoque por IMEI',
      'OS com evidências e aceite',
      'Orçamentos e financeiro',
      'Até 2 usuários',
    ],
  },
  profissional: {
    id: 'profissional',
    label: 'Profissional',
    precoHint: 'R$ 197/mês',
    precoMensal: 197,
    precoAnual: 1970,
    checkoutDisponivel: true,
    maxUsuarios: 5,
    podeNfce: true,
    podeConsultas: true,
    podeMultiLoja: false,
    destaques: [
      'Tudo do Essencial',
      'NFC-e no PDV (créditos + Focus)',
      'Consultas CPF/CNPJ e IMEI (créditos)',
      'Painel fiscal',
      'Até 5 usuários',
    ],
  },
  rede: {
    id: 'rede',
    label: 'Rede',
    precoHint: 'Sob consulta',
    precoMensal: null,
    precoAnual: null,
    checkoutDisponivel: false,
    maxUsuarios: 25,
    podeNfce: true,
    podeConsultas: true,
    podeMultiLoja: true,
    destaques: [
      'Tudo do Profissional',
      'Multi-loja (roadmap)',
      'Consultas CPF/IMEI (créditos)',
      'Até 25 usuários',
    ],
  },
};

export const PLANOS_IDS = Object.keys(PLANOS);

/** Ciclos de cobrança no checkout Asaas. */
export const CICLOS_ASSINATURA = {
  mensal: {
    id: 'mensal',
    label: 'Mensal',
    asaasCycle: 'MONTHLY',
    diasVigencia: 31,
  },
  anual: {
    id: 'anual',
    label: 'Anual',
    asaasCycle: 'YEARLY',
    diasVigencia: 366,
    descontoHint: '2 meses grátis',
  },
};

export const CICLOS_IDS = Object.keys(CICLOS_ASSINATURA);

export const ASSINATURA_STATUS_ATIVOS = ['trial', 'ativa'];

/** Dias de trial no onboarding self-serve (espelho da migration 028). */
export const TRIAL_DIAS = 14;

/** Cotas gratuitas de consulta no trial (por loja / CNPJ). */
export const TRIAL_LIMITE_CONSULTA_CPF_CNPJ = 3;
export const TRIAL_LIMITE_CONSULTA_IMEI = 2;

export function normalizarPlano(plano) {
  if (plano && PLANOS[plano]) return plano;
  return 'essencial';
}

export function normalizarCiclo(ciclo) {
  return ciclo === 'anual' ? 'anual' : 'mensal';
}

export function getPlanoDef(plano) {
  return PLANOS[normalizarPlano(plano)];
}

export function getCicloDef(ciclo) {
  return CICLOS_ASSINATURA[normalizarCiclo(ciclo)];
}

/** Valor cobrado no Asaas para o plano + ciclo. */
export function precoCheckout(plano, ciclo = 'mensal') {
  const def = getPlanoDef(plano);
  if (normalizarCiclo(ciclo) === 'anual') return def.precoAnual;
  return def.precoMensal;
}

/** Texto de preço para UI/confirmação. */
export function precoHintCiclo(plano, ciclo = 'mensal') {
  const def = getPlanoDef(plano);
  if (!def.checkoutDisponivel || def.precoMensal == null) return def.precoHint;
  if (normalizarCiclo(ciclo) === 'anual') {
    return `R$ ${Number(def.precoAnual).toLocaleString('pt-BR')}/ano`;
  }
  return `R$ ${Number(def.precoMensal).toLocaleString('pt-BR')}/mês`;
}

/** Preço “cheio” anual (12× mensal) para mostrar riscado. */
export function precoAnualCheioHint(plano) {
  const def = getPlanoDef(plano);
  if (def.precoMensal == null) return null;
  const cheio = def.precoMensal * 12;
  return `R$ ${cheio.toLocaleString('pt-BR')}`;
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
  return `NFC-e está no plano Profissional (módulo liberado + créditos por emissão via Focus). Sua loja está no ${atual}. Faça upgrade para usar.`;
}

export function mensagemConsultaIndisponivel({ podeConsultas = false } = {}) {
  if (!podeConsultas) {
    return 'Consultas CPF/CNPJ e IMEI estão no plano Profissional (e Rede). Cada consulta consome créditos da carteira.';
  }
  return 'A API externa ainda não está configurada nos Secrets do Supabase. Créditos só são debitados após consulta bem-sucedida.';
}

export function mensagemUpgradeConsultas(plano) {
  const atual = getPlanoDef(plano).label;
  return `Consultas CPF/CNPJ e IMEI estão no plano Profissional. Sua loja está no ${atual}. Faça upgrade para usar (cobrança por crédito).`;
}

export function mensagemTrialConsultaLimite(tipo = 'cpf_cnpj') {
  if (tipo === 'imei') {
    return `No trial você pode fazer até ${TRIAL_LIMITE_CONSULTA_IMEI} consultas IMEI por loja. Assine um plano para continuar com créditos.`;
  }
  return `No trial você pode fazer até ${TRIAL_LIMITE_CONSULTA_CPF_CNPJ} consultas CPF/CNPJ por loja. Assine um plano para continuar com créditos.`;
}

export function rotuloTrialConsultas(trialConsultas) {
  if (!trialConsultas?.ativo) return null;
  const cpfRest =
    Math.max(
      0,
      (trialConsultas.cpf_cnpj_limite ?? TRIAL_LIMITE_CONSULTA_CPF_CNPJ) -
        (trialConsultas.cpf_cnpj_usados ?? 0)
    );
  const imeiRest =
    Math.max(
      0,
      (trialConsultas.imei_limite ?? TRIAL_LIMITE_CONSULTA_IMEI) -
        (trialConsultas.imei_usados ?? 0)
    );
  return `Trial: restam ${cpfRest} consulta(s) CPF/CNPJ e ${imeiRest} IMEI.`;
}
