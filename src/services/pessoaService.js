import { supabase } from '../lib/supabaseClient';
import { formatCpfCnpj, onlyDigits } from '../utils/formatters';

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
  const cpfCnpj = onlyDigits(formData.cpf);
  const cep = onlyDigits(formData.cep);

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
  };
}

export function mapPessoaMeta(pessoa) {
  return {
    tipoPessoa: pessoa.tipo === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
    categoria: CATEGORIA_DB_TO_UI[pessoa.categoria] ?? 'Cliente',
  };
}

export async function listPessoasResumo(lojaId, { categoria = 'cliente' } = {}) {
  let query = supabase
    .from('pessoas_resumo')
    .select('*')
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

export async function createPessoa(lojaId, payload) {
  const { data: codigo, error: codigoError } = await supabase.rpc('next_pessoa_codigo', {
    p_loja_id: lojaId,
  });

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
