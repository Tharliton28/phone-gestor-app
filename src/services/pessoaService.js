import { supabase } from '../lib/supabaseClient';
import { formatCpfCnpj, onlyDigits, validateCpfCnpj, validateTelefone } from '../utils/formatters';

const CATEGORIA_UI_TO_DB = {
  Cliente: 'cliente',
  Fornecedor: 'fornecedor',
  Técnico: 'tecnico',
  Motoboy: 'motoboy',
};

const CATEGORIA_DB_TO_UI = Object.fromEntries(
  Object.entries(CATEGORIA_UI_TO_DB).map(([ui, db]) => [db, ui])
);

export function mapFormToPessoa(formData, { tipoPessoa, categoria }) {
  const cpfValidation = validateCpfCnpj(formData.cpf);
  if (!cpfValidation.valid) {
    throw new Error(cpfValidation.message);
  }

  const cpfCnpj = cpfValidation.digits;
  const cep = onlyDigits(formData.cep);

  const telefoneValidation = validateTelefone(formData.telefone);
  if (!telefoneValidation.valid) {
    throw new Error(telefoneValidation.message);
  }

  return {
    tipo: tipoPessoa === 'Pessoa Jurídica' ? 'juridica' : 'fisica',
    categoria: CATEGORIA_UI_TO_DB[categoria] ?? 'cliente',
    cpf_cnpj: cpfCnpj || null,
    nome: formData.nome.trim(),
    origem: formData.origem || null,
    inscricao_estadual: formData.inscEstadual || null,
    indicador_contribuinte: formData.indContribuinte || null,
    inscricao_municipal: formData.inscMunicipal || null,
    data_nascimento: formData.dataNascimento || null,
    genero: formData.genero || null,
    telefone: formData.telefone || null,
    telefone_alternativo: formData.telefoneAlt || null,
    email: formData.email || null,
    instagram: formData.instagram || null,
    cep: cep || null,
    logradouro: formData.rua || null,
    numero: formData.numero || null,
    complemento: formData.complemento || null,
    bairro: formData.bairro || null,
    cidade: formData.cidade || null,
    estado: formData.estado ? formData.estado.toUpperCase().slice(0, 2) : null,
    observacoes: formData.observacoes || null,
    // autoriza_consulta_* só via termo OS / link de autorização (não pelo formulário)
  };
}

export function mapPessoaToForm(pessoa) {
  return {
    cpf: formatCpfCnpj(pessoa.cpf_cnpj),
    nome: pessoa.nome ?? '',
    origem: pessoa.origem ?? '',
    inscEstadual: pessoa.inscricao_estadual ?? '',
    indContribuinte: pessoa.indicador_contribuinte ?? '',
    inscMunicipal: pessoa.inscricao_municipal ?? '',
    dataNascimento: pessoa.data_nascimento ?? '',
    genero: pessoa.genero ?? '',
    telefone: pessoa.telefone ?? '',
    telefoneAlt: pessoa.telefone_alternativo ?? '',
    email: pessoa.email ?? '',
    instagram: pessoa.instagram ?? '',
    cep: pessoa.cep ?? '',
    rua: pessoa.logradouro ?? '',
    numero: pessoa.numero ?? '',
    bairro: pessoa.bairro ?? '',
    cidade: pessoa.cidade ?? '',
    estado: pessoa.estado ?? '',
    complemento: pessoa.complemento ?? '',
    observacoes: pessoa.observacoes ?? '',
    autorizaConsultaDados: Boolean(pessoa.autoriza_consulta_dados),
    autorizaConsultaEm: pessoa.autoriza_consulta_em ?? '',
    autorizaConsultaOrigem: pessoa.autoriza_consulta_origem ?? '',
  };
}

export function mapPessoaMeta(pessoa) {
  return {
    tipoPessoa: pessoa.tipo === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
    categoria: CATEGORIA_DB_TO_UI[pessoa.categoria] ?? 'Cliente',
  };
}

export const CATEGORIA_LABEL = {
  cliente: 'Cliente',
  fornecedor: 'Fornecedor',
  tecnico: 'Técnico',
  motoboy: 'Motoboy',
};

export async function listPessoasResumo(lojaId, { categoria = null } = {}) {
  let query = supabase
    .from('pessoas')
    .select('id, loja_id, codigo, nome, cpf_cnpj, telefone, telefone_alternativo, categoria, ativo, created_at, updated_at')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (categoria) {
    query = query.eq('categoria', categoria);
  }

  return query;
}

export async function getPessoaStats(lojaId) {
  const [totalResult, clientesResult] = await Promise.all([
    supabase
      .from('pessoas')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId)
      .eq('ativo', true),
    supabase
      .from('pessoas')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId)
      .eq('ativo', true)
      .eq('categoria', 'cliente'),
  ]);

  if (totalResult.error) throw totalResult.error;
  if (clientesResult.error) throw clientesResult.error;

  return {
    totalPessoas: totalResult.count ?? 0,
    totalClientes: clientesResult.count ?? 0,
  };
}

export async function getPessoaById(lojaId, pessoaId) {
  return supabase
    .from('pessoas')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('id', pessoaId)
    .maybeSingle();
}

export async function getPessoaByCpfCnpj(lojaId, cpfCnpj) {
  const digits = onlyDigits(cpfCnpj);
  if (!digits) return { data: null, error: null };

  return supabase
    .from('pessoas')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('cpf_cnpj', digits)
    .maybeSingle();
}

export function mensagemErroPessoa(error) {
  const msg = String(error?.message || '');
  const code = error?.code;
  if (
    code === '23505'
    || msg.includes('pessoas_loja_cpf_cnpj_uidx')
    || /duplicate key.*cpf_cnpj/i.test(msg)
  ) {
    return 'Já existe um cadastro com este CPF/CNPJ nesta loja. Abra o cadastro existente para continuar.';
  }
  return msg || 'Não foi possível salvar o cadastro.';
}

async function getNextPessoaCodigo(lojaId) {
  const { data, error } = await supabase.rpc('next_pessoa_codigo', {
    p_loja_id: lojaId,
  });

  if (!error && data != null) {
    return { codigo: data, error: null };
  }

  // Fallback quando a RPC ainda não foi criada no Supabase (migration 002 incompleta)
  const { data: rows, error: queryError } = await supabase
    .from('pessoas')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('codigo', { ascending: false })
    .limit(1);

  if (queryError) {
    return { codigo: null, error: queryError };
  }

  return { codigo: (rows?.[0]?.codigo ?? 0) + 1, error: null };
}

export async function createPessoa(lojaId, payload) {
  const { codigo, error: codigoError } = await getNextPessoaCodigo(lojaId);

  if (codigoError) {
    return { data: null, error: codigoError };
  }

  return supabase
    .from('pessoas')
    .insert({ ...payload, loja_id: lojaId, codigo })
    .select()
    .single();
}

export async function updatePessoa(lojaId, pessoaId, payload) {
  return supabase
    .from('pessoas')
    .update(payload)
    .eq('loja_id', lojaId)
    .eq('id', pessoaId)
    .select()
    .single();
}

export async function desativarPessoa(lojaId, pessoaId) {
  return updatePessoa(lojaId, pessoaId, { ativo: false });
}
