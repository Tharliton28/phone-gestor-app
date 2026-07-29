import { parseMoney, roundMoney } from '../utils/formatters';
import { calcTaxaValor } from './vendaCalculos';

export const FORMA_SIM = {
  PIX: 'pix',
  DEBITO: 'debito',
  CREDITO: 'credito',
};

/** Total de uma linha do orçamento (arredondado por linha — padrão ERP) */
export function calcItemLinhaOrcamento(quantidade, valorUnitario, desconto = 0) {
  const bruto = roundMoney(Number(quantidade) * parseMoney(valorUnitario));
  const desc = roundMoney(parseMoney(desconto));
  return roundMoney(Math.max(0, bruto - desc));
}

/** Totais dos itens — subtotal bruto, descontos e líquido */
export function calcTotaisItensOrcamento(itens) {
  const lista = itens ?? [];

  const valorSubtotalBruto = roundMoney(
    lista.reduce(
      (acc, item) =>
        acc + Number(item.quantidade || 1) * parseMoney(item.preco ?? item.valorUnitario),
      0
    )
  );

  const valorDesconto = roundMoney(
    lista.reduce((acc, item) => acc + parseMoney(item.desconto ?? item.valorDesconto), 0)
  );

  const valorSubtotalLiquido = roundMoney(
    lista.reduce(
      (acc, item) =>
        acc
        + calcItemLinhaOrcamento(
          item.quantidade,
          item.preco ?? item.valorUnitario,
          item.desconto ?? item.valorDesconto
        ),
      0
    )
  );

  return {
    valorSubtotalBruto,
    valorDesconto,
    valorSubtotalLiquido,
  };
}

/** Distribui valor em parcelas; última absorve centavos */
export function calcParcelasDistribuidas(valorTotal, numParcelas) {
  const parcelas = Math.max(1, Number(numParcelas) || 1);
  const total = roundMoney(parseMoney(valorTotal));

  if (parcelas <= 1 || total <= 0) {
    return {
      parcelas: 1,
      valorParcela: total,
      valoresParcelas: [total],
    };
  }

  const valorBaseParcela = roundMoney(total / parcelas);
  const valoresParcelas = Array.from({ length: parcelas }, () => valorBaseParcela);
  const soma = roundMoney(valorBaseParcela * parcelas);
  valoresParcelas[parcelas - 1] = roundMoney(valoresParcelas[parcelas - 1] + (total - soma));

  return {
    parcelas,
    valorParcela: valoresParcelas[0],
    valoresParcelas,
  };
}

export function calcTotalAparelhosTroca(aparelhos) {
  return roundMoney(
    (aparelhos ?? []).reduce((acc, ap) => acc + parseMoney(ap.valor ?? ap.valorAvaliacao), 0)
  );
}

/**
 * Simulação financeira do orçamento — fonte única de verdade (UI + service + PDV)
 * @param {object} params
 * @param {number} params.taxaPercentual — percentual (ex.: 5 = 5%)
 */
export function calcSimulacaoOrcamento({
  itens = [],
  entrada = 0,
  aparelhosTroca = [],
  formaPagamentoSim = FORMA_SIM.PIX,
  parcelas = 1,
  adicionarTaxa = true,
  taxaPercentual = 0,
}) {
  const { valorSubtotalBruto, valorDesconto, valorSubtotalLiquido } = calcTotaisItensOrcamento(itens);

  const valorEntrada = roundMoney(parseMoney(entrada));
  const valorAparelhos = calcTotalAparelhosTroca(aparelhosTroca);
  const valorRestanteBase = roundMoney(
    Math.max(0, valorSubtotalLiquido - valorEntrada - valorAparelhos)
  );

  const taxaAplica =
    Boolean(adicionarTaxa)
    && formaPagamentoSim !== FORMA_SIM.PIX
    && Number(taxaPercentual) > 0
    && valorRestanteBase > 0;

  const valorTaxa = taxaAplica ? calcTaxaValor(valorRestanteBase, taxaPercentual) : 0;
  const valorAcrescimo = valorTaxa;
  const valorTotal = roundMoney(valorSubtotalLiquido + valorAcrescimo);
  const valorFinanciado = roundMoney(valorRestanteBase + valorTaxa);

  const numParcelas = formaPagamentoSim === FORMA_SIM.CREDITO ? parcelas : 1;
  const parcelamento = calcParcelasDistribuidas(valorFinanciado, numParcelas);

  return {
    valorSubtotalBruto,
    valorDesconto,
    valorSubtotalLiquido,
    valorEntrada,
    valorAparelhos,
    valorRestanteBase,
    valorTaxa,
    valorAcrescimo,
    valorTotal,
    valorFinanciado,
    taxaPercentual: taxaAplica ? Number(taxaPercentual) : 0,
    taxaRepassada: taxaAplica,
    formaPagamentoSim,
    parcelas: numParcelas,
    parcelamento,
  };
}

/** Reconstrói simulação a partir do registro persistido (sem recalcular taxa) */
export function simulacaoFromOrcamentoPersistido(orcamento) {
  const valorSubtotalLiquido = roundMoney(
    parseMoney(orcamento.valor_subtotal) - parseMoney(orcamento.valor_desconto)
  );
  const valorEntrada = roundMoney(parseMoney(orcamento.valor_entrada));
  const valorAparelhos = calcTotalAparelhosTroca(orcamento.aparelhos);
  const valorAcrescimo = roundMoney(parseMoney(orcamento.valor_acrescimo));
  const valorTotal = roundMoney(parseMoney(orcamento.valor_total));

  const valorRestanteBase = orcamento.valor_restante_sim != null
    ? roundMoney(parseMoney(orcamento.valor_restante_sim))
    : roundMoney(
      Math.max(0, valorSubtotalLiquido - valorEntrada - valorAparelhos)
    );

  const taxaRepassada = Boolean(orcamento.taxa_repassada);
  const valorTaxa = taxaRepassada ? valorAcrescimo : 0;
  const valorFinanciado = roundMoney(valorRestanteBase + valorTaxa);
  const parcelas = Number(orcamento.parcelas_sim) || 1;

  return {
    valorSubtotalLiquido,
    valorEntrada,
    valorAparelhos,
    valorRestanteBase,
    valorTaxa,
    valorAcrescimo,
    valorTotal,
    valorFinanciado,
    taxaPercentual: Number(orcamento.taxa_percentual) || 0,
    taxaRepassada,
    formaPagamentoSim: orcamento.forma_pagamento_sim ?? FORMA_SIM.PIX,
    parcelas,
    parcelamento: calcParcelasDistribuidas(valorFinanciado, parcelas),
  };
}

export function serializarItensOrcamento(itens) {
  return (itens ?? []).map((item) => ({
    produtoId: item.produtoId ?? item.produto_id ?? item.id ?? null,
    nome: item.nome?.trim() || item.descricao?.trim() || 'Item',
    descricao: item.nome?.trim() || item.descricao?.trim() || 'Item',
    quantidade: Number(item.quantidade) || 1,
    preco: roundMoney(parseMoney(item.preco ?? item.valorUnitario)),
    valorUnitario: roundMoney(parseMoney(item.preco ?? item.valorUnitario)),
    desconto: roundMoney(parseMoney(item.desconto ?? item.valorDesconto)),
    valorDesconto: roundMoney(parseMoney(item.desconto ?? item.valorDesconto)),
    valorTotal: calcItemLinhaOrcamento(
      item.quantidade,
      item.preco ?? item.valorUnitario,
      item.desconto ?? item.valorDesconto
    ),
  }));
}

function findFormaByTipo(formasPagamento, tipo) {
  return (formasPagamento ?? []).find((f) => f.tipo === tipo) ?? null;
}

function findFormaCredito(formasPagamento, parcelas) {
  const lista = (formasPagamento ?? []).filter((f) => f.tipo === 'credito');
  if (!lista.length) return null;

  if (Number(parcelas) <= 1) {
    return lista.find((f) => /vista/i.test(f.nome ?? '')) ?? lista[0];
  }

  return lista.find((f) => /parcel/i.test(f.nome ?? '')) ?? lista[0];
}

function criarLinhaPagamentoPdv({
  id,
  forma,
  formaPagamentoId,
  formaNome,
  formaTipo,
  valor,
  valorBase,
  valorTaxa,
  parcelas,
  detalhes,
  taxa,
  taxaRepassada,
  aparelhoEntrada,
}) {
  return {
    id,
    forma,
    formaPagamentoId,
    formaNome,
    formaTipo,
    valor: roundMoney(valor),
    valorBase: roundMoney(valorBase),
    valorTaxa: roundMoney(valorTaxa),
    parcelas,
    detalhes: detalhes ?? '',
    taxa: Number(taxa) || 0,
    taxaRepassada: Boolean(taxaRepassada),
    autoPreenchido: true,
    aparelhoEntrada: aparelhoEntrada ?? null,
  };
}

/**
 * Monta pagamentos do PDV a partir do orçamento salvo — valores fechados, sem retaxar.
 */
export function buildPagamentosPdvFromOrcamento(orcamento, formasPagamento = [], formatLabel) {
  const sim = simulacaoFromOrcamentoPersistido(orcamento);
  const pagamentos = [];
  const criarId = () => Date.now() + Math.random();
  const label = formatLabel ?? ((f) => f?.nome ?? 'Pagamento');

  if (sim.valorEntrada > 0) {
    const formaPix = findFormaByTipo(formasPagamento, 'pix')
      ?? findFormaByTipo(formasPagamento, 'dinheiro');
    pagamentos.push(criarLinhaPagamentoPdv({
      id: criarId(),
      forma: formaPix ? label(formaPix) : 'PIX',
      formaPagamentoId: formaPix?.id ?? null,
      formaNome: formaPix?.nome ?? 'PIX',
      formaTipo: formaPix?.tipo ?? 'pix',
      valor: sim.valorEntrada,
      valorBase: sim.valorEntrada,
      valorTaxa: 0,
      parcelas: 'À vista',
      taxa: Number(formaPix?.taxa_percentual) || 0,
      taxaRepassada: false,
    }));
  }

  for (const ap of orcamento.aparelhos ?? []) {
    const valorAp = roundMoney(parseMoney(ap.valor_avaliacao));
    if (valorAp <= 0) continue;

    pagamentos.push(criarLinhaPagamentoPdv({
      id: criarId(),
      forma: 'Aparelho Usado (Entrada)',
      formaPagamentoId: null,
      formaNome: 'Aparelho Usado (Entrada)',
      formaTipo: 'aparelho_troca',
      valor: valorAp,
      valorBase: valorAp,
      valorTaxa: 0,
      parcelas: 'À vista',
      detalhes: `${ap.modelo}${ap.imei ? ` (IMEI: ${ap.imei})` : ''}`,
      taxa: 0,
      taxaRepassada: false,
      aparelhoEntrada: {
        modelo: ap.modelo,
        imei: ap.imei ?? '',
        valor: valorAp,
      },
    }));
  }

  if (sim.valorRestanteBase > 0 || sim.valorFinanciado > 0) {
    const tipo = sim.formaPagamentoSim;
    let forma = null;

    if (tipo === FORMA_SIM.CREDITO) {
      forma = findFormaCredito(formasPagamento, sim.parcelas);
    } else if (tipo === FORMA_SIM.DEBITO) {
      forma = findFormaByTipo(formasPagamento, 'debito');
    } else {
      forma = findFormaByTipo(formasPagamento, 'pix') ?? findFormaByTipo(formasPagamento, 'dinheiro');
    }

    const valorBase = sim.valorRestanteBase;
    const valorTaxa = sim.taxaRepassada ? sim.valorTaxa : 0;
    const valor = roundMoney(valorBase + valorTaxa);

    pagamentos.push(criarLinhaPagamentoPdv({
      id: criarId(),
      forma: forma ? label(forma) : (tipo === FORMA_SIM.CREDITO ? 'Cartão Crédito' : tipo === FORMA_SIM.DEBITO ? 'Cartão Débito' : 'PIX'),
      formaPagamentoId: forma?.id ?? null,
      formaNome: forma?.nome ?? 'Pagamento',
      formaTipo: forma?.tipo ?? tipo,
      valor,
      valorBase,
      valorTaxa,
      parcelas: sim.parcelas > 1 ? `${sim.parcelas}x` : 'À vista',
      taxa: sim.taxaPercentual,
      taxaRepassada: sim.taxaRepassada && valorTaxa > 0,
    }));
  }

  if (!pagamentos.length) {
    pagamentos.push({
      id: criarId(),
      forma: '',
      formaPagamentoId: null,
      formaNome: '',
      formaTipo: null,
      valor: 0,
      valorBase: 0,
      valorTaxa: 0,
      parcelas: 'À vista',
      detalhes: '',
      taxa: 0,
      taxaRepassada: false,
      autoPreenchido: false,
      aparelhoEntrada: null,
    });
  }

  return { pagamentos, simulacao: sim };
}
