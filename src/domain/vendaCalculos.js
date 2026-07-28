import { parseMoney, roundMoney, moneyToCents } from '../utils/formatters';

/** Total de uma linha do carrinho (arredondado por linha — padrão ERP) */
export function calcItemTotal(quantidade, valorUnitario) {
  return roundMoney(Math.max(0, Number(quantidade) * parseMoney(valorUnitario)));
}

/** Subtotal somando totais por linha já arredondados */
export function calcSubtotalItens(itens) {
  return roundMoney(
    (itens ?? []).reduce(
      (acc, item) => acc + calcItemTotal(item.quantidade, item.preco ?? item.valorUnitario),
      0
    )
  );
}

/** Valor da taxa sobre base (ex.: repasse ao cliente) */
export function calcTaxaValor(valorBase, taxaPercentual) {
  const base = parseMoney(valorBase);
  const taxa = Number(taxaPercentual) || 0;
  if (base <= 0 || taxa <= 0) return 0;
  return roundMoney(base * (taxa / 100));
}

/** Extrai base quando o valor informado já inclui a taxa repassada */
export function calcBaseComTaxaInclusa(valorComTaxa, taxaPercentual) {
  const total = parseMoney(valorComTaxa);
  const taxa = Number(taxaPercentual) || 0;
  if (total <= 0 || taxa <= 0) return total;
  return roundMoney(total / (1 + taxa / 100));
}

/** Soma taxas repassadas registradas nos pagamentos */
export function calcTaxasRepassadas(pagamentos) {
  return roundMoney(
    (pagamentos ?? []).reduce((acc, pag) => {
      if (!pag.taxaRepassada) return acc;
      if (pag.valorTaxa != null) return acc + roundMoney(pag.valorTaxa);
      const base = parseMoney(pag.valorBase ?? pag.valor);
      return acc + calcTaxaValor(base, pag.taxa);
    }, 0)
  );
}

/** Totais da venda — fonte única de verdade (UI + service + RPC) */
export function calcVendaTotais(itens, desconto = 0, pagamentos = [], acrescimoManual = 0) {
  const valorSubtotal = calcSubtotalItens(itens);
  const descontoBruto = roundMoney(desconto);
  const valorDesconto = roundMoney(Math.min(descontoBruto, valorSubtotal));
  const valorTaxas = calcTaxasRepassadas(pagamentos);
  const valorAcrescimo = roundMoney(parseMoney(acrescimoManual) + valorTaxas);
  const valorTotal = roundMoney(Math.max(0, valorSubtotal - valorDesconto + valorAcrescimo));

  return {
    valorSubtotal,
    valorDesconto,
    valorTaxas,
    valorAcrescimo,
    valorTotal,
  };
}

export function calcTotalPago(pagamentos) {
  return roundMoney(
    (pagamentos ?? []).reduce((acc, pag) => acc + parseMoney(pag.valor), 0)
  );
}

export function calcValorRestante(valorTotal, pagamentos) {
  return roundMoney(parseMoney(valorTotal) - calcTotalPago(pagamentos));
}

export function calcTroco(valorTotal, pagamentos) {
  const restante = calcValorRestante(valorTotal, pagamentos);
  return restante < 0 ? roundMoney(Math.abs(restante)) : 0;
}

export function pagamentoCompleto(valorTotal, pagamentos) {
  return moneyToCents(calcTotalPago(pagamentos)) >= moneyToCents(valorTotal);
}

export function parseNumeroParcelas(parcelasLabel) {
  if (!parcelasLabel || parcelasLabel === 'À vista') return 1;
  const match = String(parcelasLabel).match(/(\d+)/);
  return match ? Math.max(1, Number(match[1])) : 1;
}

export function calcValorParcela(valorTotal, parcelasLabel) {
  const parcelas = parseNumeroParcelas(parcelasLabel);
  const valor = parseMoney(valorTotal);
  if (valor <= 0 || parcelas <= 1) return valor;
  return roundMoney(valor / parcelas);
}

export function calcDescontoFromInput(tipo, valorInput, subtotal) {
  const valorNum = parseMoney(valorInput);
  if (valorNum < 0) return 0;
  if (tipo === 'perc') {
    return roundMoney(subtotal * (Math.min(valorNum, 100) / 100));
  }
  return roundMoney(Math.min(valorNum, subtotal));
}

export function aplicarRepassarTaxa(pagamento, taxaPercentual) {
  const base = parseMoney(pagamento.valorBase ?? pagamento.valor);
  if (base <= 0) return null;
  const valorTaxa = calcTaxaValor(base, taxaPercentual);
  return {
    ...pagamento,
    valorBase: base,
    valorTaxa,
    valor: roundMoney(base + valorTaxa),
    taxaRepassada: true,
  };
}

export function removerRepassarTaxa(pagamento, taxaPercentual) {
  const totalComTaxa = parseMoney(pagamento.valor);
  const base = calcBaseComTaxaInclusa(totalComTaxa, taxaPercentual);
  const valorTaxa = roundMoney(totalComTaxa - base);
  return {
    pagamento: {
      ...pagamento,
      valor: base,
      valorBase: base,
      valorTaxa: 0,
      taxaRepassada: false,
    },
    valorTaxaRemovida: valorTaxa,
  };
}

/** Agrupa acessórios/peças; aparelhos com IMEI são sempre linha única */
export function podeAgruparCarrinho(produto, itemCarrinho) {
  if (produto.imei || itemCarrinho.imei) return false;
  return produto.produtoId === itemCarrinho.produtoId && produto.preco === itemCarrinho.preco;
}

export function serializarItensParaVenda(itens) {
  return (itens ?? []).map((item) => ({
    produtoId: item.produtoId ?? item.produto_id ?? null,
    nome: item.nome,
    descricao: item.nome,
    imei: item.imei ?? null,
    quantidade: Number(item.quantidade) || 1,
    preco: parseMoney(item.preco ?? item.valorUnitario),
    valorUnitario: parseMoney(item.preco ?? item.valorUnitario),
  }));
}

export function serializarPagamentosParaVenda(pagamentos) {
  return (pagamentos ?? [])
    .filter((pag) => parseMoney(pag.valor) > 0)
    .map((pag) => ({
      formaPagamentoId: pag.formaPagamentoId ?? null,
      formaNome: pag.formaNome ?? pag.forma ?? 'Não informado',
      forma: pag.forma ?? pag.formaNome ?? '',
      valor: parseMoney(pag.valor),
      valorBase: parseMoney(pag.valorBase ?? pag.valor),
      valorTaxa: roundMoney(pag.valorTaxa ?? 0),
      parcelas: pag.parcelas ?? null,
      detalhes: pag.detalhes?.trim() || null,
      taxa: Number(pag.taxa) || 0,
      taxaRepassada: Boolean(pag.taxaRepassada),
      aparelhoEntrada: pag.aparelhoEntrada ?? null,
    }));
}
