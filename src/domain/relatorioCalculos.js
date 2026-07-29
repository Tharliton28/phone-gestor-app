import { roundMoney } from '../utils/formatters';

export function periodoPadrao(referencia = new Date()) {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: referencia.toISOString().slice(0, 10),
  };
}

export function calcResumoVendas(vendas = []) {
  const lista = vendas.filter((v) => v.status === 'concluido');
  const quantidade = lista.length;
  const faturamento = roundMoney(lista.reduce((acc, v) => acc + Number(v.valor_total || 0), 0));
  const ticketMedio = quantidade > 0 ? roundMoney(faturamento / quantidade) : 0;

  return { quantidade, faturamento, ticketMedio };
}

export function calcVendasPorVendedor(vendas = []) {
  const map = {};

  for (const venda of vendas) {
    if (venda.status !== 'concluido') continue;

    const nome = venda.vendedor?.nome ?? 'Sem vendedor';
    if (!map[nome]) {
      map[nome] = { vendedor: nome, quantidade: 0, total: 0 };
    }

    map[nome].quantidade += 1;
    map[nome].total = roundMoney(map[nome].total + Number(venda.valor_total || 0));
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

export function calcResumoTaxas(vendas = []) {
  let taxaRepassadaCliente = 0;
  let custoOperadoraEstimado = 0;
  let volumeCartao = 0;

  for (const venda of vendas) {
    if (venda.status !== 'concluido') continue;

    for (const pag of venda.pagamentos ?? []) {
      const valor = Number(pag.valor || 0);
      const valorBase = Number(pag.valor_base ?? pag.valor ?? 0);
      const valorTaxa = Number(pag.valor_taxa || 0);
      const taxaPct = Number(pag.taxa_percentual || 0);

      if (pag.taxa_repassada) {
        taxaRepassadaCliente = roundMoney(taxaRepassadaCliente + valorTaxa);
      }

      const custo = valorTaxa > 0
        ? valorTaxa
        : roundMoney(valorBase * (taxaPct / 100));

      custoOperadoraEstimado = roundMoney(custoOperadoraEstimado + custo);

      if (taxaPct > 0 || valorTaxa > 0) {
        volumeCartao = roundMoney(volumeCartao + valorBase);
      }
    }
  }

  return {
    taxaRepassadaCliente,
    custoOperadoraEstimado,
    volumeCartao,
    impactoLiquido: roundMoney(taxaRepassadaCliente - custoOperadoraEstimado),
  };
}

export function calcFunilOrcamentos(orcamentos = []) {
  const contagem = {
    pendente: 0,
    aprovado: 0,
    rejeitado: 0,
    expirado: 0,
    convertido: 0,
  };

  let valorTotal = 0;
  let valorConvertido = 0;

  for (const orc of orcamentos) {
    const status = orc.status ?? 'pendente';
    if (contagem[status] != null) {
      contagem[status] += 1;
    }

    const valor = Number(orc.valor_total || 0);
    valorTotal = roundMoney(valorTotal + valor);

    if (status === 'convertido') {
      valorConvertido = roundMoney(valorConvertido + valor);
    }
  }

  const total = orcamentos.length;
  const taxaConversao = total > 0
    ? roundMoney((contagem.convertido / total) * 100)
    : 0;

  return {
    contagem,
    total,
    valorTotal,
    valorConvertido,
    taxaConversao,
  };
}
