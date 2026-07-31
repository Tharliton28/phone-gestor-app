import { gerarChaveAcessoMock, gerarProtocoloMock } from '../../domain/nfce';

/**
 * Provider de desenvolvimento. Troque por Focus/eNotas sem mudar o service.
 * @returns {Promise<{ ok: boolean, status: string, chaveAcesso?: string, protocolo?: string, mensagem: string, providerRef: string }>}
 */
export async function emitirNfceMock({ serie, numero, valorTotal, ambiente }) {
  await new Promise((r) => setTimeout(r, 180));

  const chaveAcesso = gerarChaveAcessoMock({ serie, numero });
  const protocolo = gerarProtocoloMock();

  return {
    ok: true,
    status: 'mock',
    chaveAcesso,
    protocolo,
    mensagem: `NFC-e simulada (${ambiente}). Valor R$ ${Number(valorTotal || 0).toFixed(2)}. Sem envio à SEFAZ.`,
    providerRef: `mock:${chaveAcesso.slice(-8)}`,
  };
}
