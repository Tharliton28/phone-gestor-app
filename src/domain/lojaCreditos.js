/** Catálogo de consumo — espelha loja_credito_custos no banco. */
export const CUSTO_CREDITOS = {
  consulta_cpf_cnpj: { creditos: 1, label: 'Consulta CPF/CNPJ' },
  consulta_imei: { creditos: 2, label: 'Consulta IMEI' },
  nfce_emissao: { creditos: 4, label: 'Emissão NFC-e' },
  nfe_emissao: { creditos: 5, label: 'Emissão NF-e' },
};

export const PACOTES_CREDITOS = [
  {
    id: 'pacote_50',
    creditos: 50,
    label: 'Pacote 50',
    preco: 29.9,
    precoHint: 'R$ 29,90',
    checkoutDisponivel: true,
  },
  {
    id: 'pacote_150',
    creditos: 150,
    label: 'Pacote 150',
    preco: 79.9,
    precoHint: 'R$ 79,90',
    checkoutDisponivel: true,
  },
  {
    id: 'pacote_500',
    creditos: 500,
    label: 'Pacote 500',
    preco: 229.9,
    precoHint: 'R$ 229,90',
    checkoutDisponivel: true,
  },
];

export function getPacoteCreditos(pacoteId) {
  return PACOTES_CREDITOS.find((p) => p.id === pacoteId) || null;
}

export function custoAcao(acao) {
  return CUSTO_CREDITOS[acao] ?? null;
}

export function temSaldoSuficiente(saldo, acao, quantidade = null) {
  const custo = quantidade ?? CUSTO_CREDITOS[acao]?.creditos;
  if (custo == null) return false;
  return Number(saldo) >= Number(custo);
}

export function formatarSaldoCreditos(saldo) {
  const n = Number(saldo) || 0;
  return `${n} crédito${n === 1 ? '' : 's'}`;
}

export function rotuloLancamento(lancamento) {
  if (lancamento?.descricao) return lancamento.descricao;
  const custo = CUSTO_CREDITOS[lancamento?.acao];
  if (custo) return custo.label;
  if (lancamento?.acao === 'bonus_inicial') return 'Bônus inicial';
  if (lancamento?.acao === 'compra_pacote') return 'Compra de pacote';
  return lancamento?.acao ?? 'Lançamento';
}
