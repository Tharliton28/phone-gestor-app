import { supabase } from '../lib/supabaseClient';
import { formatCnpj, onlyDigits } from '../utils/formatters';

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];

export const REGIMES_TRIBUTARIOS = REGIMES;

export function mapLojaToEmpresaForm(loja) {
  if (!loja) {
    return {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      regimeTributario: 'Simples Nacional',
      email: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      codigoIbge: '',
    };
  }

  return {
    razaoSocial: loja.razao_social ?? '',
    nomeFantasia: loja.nome_fantasia ?? '',
    cnpj: formatCnpj(loja.cnpj) || onlyDigits(loja.cnpj),
    inscricaoEstadual: loja.inscricao_estadual ?? '',
    inscricaoMunicipal: loja.inscricao_municipal ?? '',
    regimeTributario: loja.regime_tributario || 'Simples Nacional',
    email: loja.email ?? '',
    telefone: loja.telefone ?? '',
    cep: formatCepDisplay(loja.cep),
    logradouro: loja.logradouro ?? '',
    numero: loja.numero ?? '',
    complemento: loja.complemento ?? '',
    bairro: loja.bairro ?? '',
    cidade: loja.cidade ?? '',
    estado: (loja.estado ?? '').toUpperCase(),
    codigoIbge: loja.codigo_ibge ?? '',
  };
}

function formatCepDisplay(cep) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return d;
  return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/** Valida e monta payload para UPDATE em public.lojas */
export function buildLojaUpdatePayload(form) {
  const razaoSocial = String(form.razaoSocial ?? '').trim();
  const cnpj = onlyDigits(form.cnpj);
  const cep = onlyDigits(form.cep) || null;
  const estado = String(form.estado ?? '').trim().toUpperCase() || null;
  const cidade = String(form.cidade ?? '').trim();

  if (!razaoSocial) {
    return { payload: null, error: new Error('Informe a razão social.') };
  }
  if (cnpj.length !== 14) {
    return { payload: null, error: new Error('CNPJ deve ter 14 dígitos.') };
  }
  if (!cidade) {
    return { payload: null, error: new Error('Informe a cidade.') };
  }
  if (cep && cep.length !== 8) {
    return { payload: null, error: new Error('CEP inválido (use 8 dígitos).') };
  }
  if (estado && estado.length !== 2) {
    return { payload: null, error: new Error('UF deve ter 2 letras (ex: CE).') };
  }

  return {
    payload: {
      razao_social: razaoSocial,
      nome_fantasia: String(form.nomeFantasia ?? '').trim() || null,
      cnpj,
      inscricao_estadual: String(form.inscricaoEstadual ?? '').trim() || null,
      inscricao_municipal: String(form.inscricaoMunicipal ?? '').trim() || null,
      regime_tributario: String(form.regimeTributario ?? '').trim() || null,
      email: String(form.email ?? '').trim() || null,
      telefone: String(form.telefone ?? '').trim() || null,
      cep,
      logradouro: String(form.logradouro ?? '').trim() || null,
      numero: String(form.numero ?? '').trim() || null,
      complemento: String(form.complemento ?? '').trim() || null,
      bairro: String(form.bairro ?? '').trim() || null,
      cidade,
      estado,
      codigo_ibge: String(form.codigoIbge ?? '').trim() || null,
    },
    error: null,
  };
}

export async function updateLojaEmpresa(lojaId, form) {
  if (!lojaId) return { data: null, error: new Error('Loja não informada.') };

  const { payload, error: validError } = buildLojaUpdatePayload(form);
  if (validError) return { data: null, error: validError };

  const { data, error } = await supabase
    .from('lojas')
    .update(payload)
    .eq('id', lojaId)
    .select(
      `
      id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
      regime_tributario, email, telefone, cep, logradouro, numero, complemento,
      bairro, cidade, estado, codigo_ibge, logo_url, ativo, plano, assinatura_status,
      assinatura_origem, plano_atualizado_em
    `
    )
    .maybeSingle();

  if (error) {
    const msg = error.message?.includes('lojas_cnpj')
      ? 'Este CNPJ já está cadastrado em outra loja.'
      : (error.message ?? 'Não foi possível salvar os dados da empresa.');
    return { data: null, error: new Error(msg) };
  }

  return { data, error: null };
}
