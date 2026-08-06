import { supabase } from '../lib/supabaseClient';
import { onlyDigits, parseMoney } from '../utils/formatters';
import { normalizeMoneyValue } from '../components/CurrencyInput';
import { formatMargemPercent } from '../domain/produtoPrecos';

const DISPONIBILIDADE_UI_TO_DB = {
  'Disponível para venda': 'disponivel_venda',
  'Uso Interno (Assistência)': 'uso_interno',
  'Aguardando Conserto': 'aguardando_conserto',
};

const DISPONIBILIDADE_DB_TO_UI = Object.fromEntries(
  Object.entries(DISPONIBILIDADE_UI_TO_DB).map(([ui, db]) => [db, ui])
);

export const STATUS_LABEL = {
  ativo: 'Ativo',
  estoque_baixo: 'Estoque Baixo',
  inativo: 'Inativo',
  aguardando_conserto: 'Aguardando Conserto',
};

export const TIPO_LABEL = {
  aparelho: 'Aparelho',
  acessorio: 'Acessório',
  peca: 'Peça',
  servico: 'Serviço',
};

export function mapFormToProduto(formData, { tipoItem }) {
  return {
    tipo: tipoItem,
    categoria: formData.categoria.trim(),
    marca: formData.marca.trim(),
    nome: formData.nome.trim(),
    ean: formData.ean || null,
    disponibilidade: DISPONIBILIDADE_UI_TO_DB[formData.disponibilidade] ?? 'disponivel_venda',
    cor: formData.cor || null,
    capacidade_gb: formData.capacidadeGb ? Number(formData.capacidadeGb) : null,
    estado_aparelho: formData.estadoAparelho || null,
    imei1: onlyDigits(formData.imei1) || null,
    imei2: onlyDigits(formData.imei2) || null,
    saude_bateria: formData.saudeBateria ? Number(formData.saudeBateria) : null,
    ciclos_bateria: formData.ciclosBateria ? Number(formData.ciclosBateria) : null,
    aparelhos_compativeis: formData.aparelhosCompativeis || null,
    qualidade_peca: formData.qualidadePeca || null,
    cor_estilo: formData.corEstilo || null,
    quantidade_atual: Number(formData.quantidadeAtual) || 0,
    quantidade_minima: Number(formData.quantidadeMinima) || 0,
    valor_custo: parseMoney(formData.valorCusto),
    custos_extras: parseMoney(formData.custosExtras),
    margem_lucro_percentual: formData.margemLucro ? Number(formData.margemLucro) : null,
    valor_venda: parseMoney(formData.valorVenda),
    data_entrada: formData.dataEntrada || null,
    dias_garantia: formData.diasGarantia ? Number(formData.diasGarantia) : 90,
    observacoes: formData.observacoes || null,
    fornecedor_id: formData.fornecedorId || null,
    numero_nfe_entrada: formData.numeroNfeEntrada || null,
    ncm: onlyDigits(formData.ncm) || null,
    cfop: onlyDigits(formData.cfop) || '5102',
    unidade: (formData.unidade || 'UN').trim().toUpperCase().slice(0, 6) || 'UN',
    icms_origem: String(formData.icmsOrigem ?? '0'),
    icms_situacao_tributaria: String(formData.icmsSituacaoTributaria || '102'),
  };
}

export function mapProdutoToForm(produto) {
  return {
    categoria: produto.categoria ?? '',
    marca: produto.marca ?? '',
    nome: produto.nome ?? '',
    ean: produto.ean ?? '',
    disponibilidade: DISPONIBILIDADE_DB_TO_UI[produto.disponibilidade] ?? 'Disponível para venda',
    cor: produto.cor ?? '',
    capacidadeGb: produto.capacidade_gb != null ? String(produto.capacidade_gb) : '',
    estadoAparelho: produto.estado_aparelho ?? '',
    imei1: produto.imei1 ?? '',
    imei2: produto.imei2 ?? '',
    saudeBateria: produto.saude_bateria ?? '',
    ciclosBateria: produto.ciclos_bateria ?? '',
    aparelhosCompativeis: produto.aparelhos_compativeis ?? '',
    qualidadePeca: produto.qualidade_peca ?? '',
    corEstilo: produto.cor_estilo ?? '',
    quantidadeAtual: produto.quantidade_atual != null ? String(produto.quantidade_atual) : '0',
    quantidadeMinima: produto.quantidade_minima != null ? String(produto.quantidade_minima) : '0',
    valorCusto: normalizeMoneyValue(produto.valor_custo),
    custosExtras: normalizeMoneyValue(produto.custos_extras),
    margemLucro:
      produto.margem_lucro_percentual != null && produto.margem_lucro_percentual !== ''
        ? formatMargemPercent(produto.margem_lucro_percentual)
        : '',
    valorVenda: normalizeMoneyValue(produto.valor_venda),
    dataEntrada: produto.data_entrada ?? '',
    diasGarantia: produto.dias_garantia != null ? String(produto.dias_garantia) : '90',
    observacoes: produto.observacoes ?? '',
    fornecedorId: produto.fornecedor_id ?? '',
    numeroNfeEntrada: produto.numero_nfe_entrada ?? '',
    ncm: produto.ncm ?? '',
    cfop: produto.cfop ?? '5102',
    unidade: produto.unidade ?? 'UN',
    icmsOrigem: produto.icms_origem ?? '0',
    icmsSituacaoTributaria: produto.icms_situacao_tributaria ?? '102',
  };
}

async function getNextProdutoCodigo(lojaId) {
  const { data, error } = await supabase.rpc('next_produto_codigo', {
    p_loja_id: lojaId,
  });

  if (!error && data != null) {
    return { codigo: data, error: null };
  }

  const { data: rows, error: queryError } = await supabase
    .from('produtos')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('codigo', { ascending: false })
    .limit(1);

  if (queryError) {
    return { codigo: null, error: queryError };
  }

  return { codigo: (rows?.[0]?.codigo ?? 0) + 1, error: null };
}

export async function listProdutos(lojaId, { tipo = null } = {}) {
  let query = supabase
    .from('produtos')
    .select(
      'id, codigo, nome, tipo, categoria, marca, quantidade_atual, valor_custo, valor_venda, status, imei1'
    )
    .eq('loja_id', lojaId)
    .neq('status', 'inativo')
    .order('nome', { ascending: true });

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  return query;
}

export async function getProdutoById(lojaId, produtoId) {
  return supabase
    .from('produtos')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('id', produtoId)
    .maybeSingle();
}

export async function createProduto(lojaId, payload) {
  const { codigo, error: codigoError } = await getNextProdutoCodigo(lojaId);

  if (codigoError) {
    return { data: null, error: codigoError };
  }

  return supabase
    .from('produtos')
    .insert({ ...payload, loja_id: lojaId, codigo })
    .select()
    .single();
}

export async function updateProduto(lojaId, produtoId, payload) {
  return supabase
    .from('produtos')
    .update(payload)
    .eq('loja_id', lojaId)
    .eq('id', produtoId)
    .select()
    .single();
}

export async function desativarProduto(lojaId, produtoId) {
  return updateProduto(lojaId, produtoId, { status: 'inativo' });
}
