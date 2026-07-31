export const STATUS_FISCAL_LABEL = {
  rascunho: 'Rascunho',
  processando: 'Processando',
  autorizado: 'Autorizado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
  mock: 'Simulado (dev)',
};

export function rotuloStatusFiscal(status) {
  return STATUS_FISCAL_LABEL[status] ?? status ?? '—';
}

export function rotuloDocumentoFiscal(doc) {
  const tipo = (doc?.tipo ?? 'nfce').toUpperCase();
  const numero = doc?.numero ?? '—';
  return `${tipo} ${numero}`;
}

export function statusFiscalEhSucesso(status) {
  return status === 'autorizado' || status === 'mock';
}

/** Chave de acesso sintética (44 dígitos) — só para provider mock. */
export function gerarChaveAcessoMock({ cUF = '23', serie, numero, agora = new Date() }) {
  const aa = String(agora.getFullYear()).slice(-2);
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const cnpj = '00000000000000';
  const mod = '65';
  const serieStr = String(serie ?? 1).padStart(3, '0');
  const nNF = String(numero ?? 1).padStart(9, '0');
  const tpEmis = '1';
  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const base = `${cUF}${aa}${mm}${cnpj}${mod}${serieStr}${nNF}${tpEmis}${cNF}`;
  const dv = String([...base].reduce((acc, d) => (acc + Number(d)) % 9, 0));
  return `${base}${dv}`.slice(0, 44).padEnd(44, '0');
}

export function gerarProtocoloMock() {
  const ts = Date.now().toString().slice(-10);
  const rand = String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
  return `135${ts}${rand}`.slice(0, 15);
}
