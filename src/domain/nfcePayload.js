import { onlyDigits } from '../utils/formatters';

const PAGAMENTO_FOCUS = {
  dinheiro: '01',
  cheque: '02',
  credito: '03',
  debito: '04',
  pix: '17',
  aparelho_troca: '99',
  outros: '99',
};

export function mapFormaPagamentoFocus(tipoDb) {
  return PAGAMENTO_FOCUS[tipoDb] ?? '99';
}

export function validarItensParaNfce(itens) {
  const erros = [];
  (itens ?? []).forEach((item, idx) => {
    const ncm = onlyDigits(item?.produto?.ncm ?? item?.ncm ?? '');
    if (ncm.length !== 8) {
      erros.push(`Item ${idx + 1} (${item?.descricao || item?.produto?.nome || 'sem nome'}): NCM com 8 dígitos é obrigatório.`);
    }
  });
  return erros;
}

/**
 * Monta o JSON da Focus NFe a partir de loja + venda (com itens/produtos/pagamentos).
 */
export function buildFocusNfcePayload({ loja, venda, serie, numero, agora = new Date() }) {
  const cnpjEmitente = onlyDigits(loja?.cnpj ?? '');
  if (cnpjEmitente.length !== 14) {
    throw new Error('CNPJ da loja inválido ou não cadastrado.');
  }

  const itens = venda?.itens ?? [];
  if (!itens.length) throw new Error('Venda sem itens para NFC-e.');

  const erros = validarItensParaNfce(itens);
  if (erros.length) throw new Error(erros.join(' '));

  const offsetMin = -agora.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const tzH = String(Math.floor(abs / 60)).padStart(2, '0');
  const tzM = String(abs % 60).padStart(2, '0');
  const isoLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}T${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}${sign}${tzH}:${tzM}`;

  const items = itens.map((item, index) => {
    const qtd = Number(item.quantidade) || 1;
    const unit = Number(item.valor_unitario) || 0;
    const bruto = Number(item.valor_total) || qtd * unit;
    const ncm = onlyDigits(item.produto?.ncm ?? '');
    const cfop = String(item.produto?.cfop || '5102').replace(/\D/g, '') || '5102';
    const unidade = (item.produto?.unidade || 'UN').slice(0, 6);
    const codigo = String(item.produto?.codigo ?? item.produto_id ?? index + 1);

    return {
      numero_item: String(index + 1),
      codigo_produto: codigo,
      codigo_ncm: ncm,
      descricao: (item.descricao || item.produto?.nome || 'Produto').slice(0, 120),
      quantidade_comercial: qtd,
      quantidade_tributavel: qtd,
      unidade_comercial: unidade,
      unidade_tributavel: unidade,
      valor_unitario_comercial: unit,
      valor_unitario_tributavel: unit,
      valor_bruto: bruto,
      cfop,
      icms_origem: String(item.produto?.icms_origem ?? '0'),
      icms_situacao_tributaria: String(item.produto?.icms_situacao_tributaria ?? '102'),
    };
  });

  const formas = (venda.pagamentos ?? []).map((pag) => ({
    forma_pagamento: mapFormaPagamentoFocus(pag.forma_tipo || pag.tipo || 'outros'),
    valor_pagamento: Number(pag.valor) || 0,
  })).filter((f) => f.valor_pagamento > 0);

  if (!formas.length) {
    formas.push({
      forma_pagamento: '99',
      valor_pagamento: Number(venda.valor_total) || 0,
    });
  }

  const payload = {
    cnpj_emitente: cnpjEmitente,
    data_emissao: isoLocal,
    natureza_operacao: 'VENDA AO CONSUMIDOR',
    local_destino: '1',
    presenca_comprador: '1',
    modalidade_frete: '9',
    indicador_inscricao_estadual_destinatario: '9',
    items,
    formas_pagamento: formas,
  };

  if (serie != null) payload.serie = String(serie);
  if (numero != null) payload.numero = String(numero);

  const cliente = venda.cliente;
  if (cliente?.nome) payload.nome_destinatario = cliente.nome;
  const doc = onlyDigits(cliente?.cpf_cnpj ?? '');
  if (doc.length === 11) payload.cpf_destinatario = doc;
  if (doc.length === 14) payload.cnpj_destinatario = doc;

  return payload;
}
