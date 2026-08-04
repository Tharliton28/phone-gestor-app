import { supabase } from '../lib/supabaseClient';
import { buildWhatsAppLink, telefoneWhatsAppCliente } from '../domain/osEvidencias';
import { formatBRL, formatCnpj } from '../utils/formatters';
import { gerarReciboVendaPdf } from '../utils/reciboVendaPdf';
import { mapVendaToRecibo } from './vendaService';

function montarMensagemRecibo({ nomeCliente, codigo, nomeEmpresa, valorTotal, pdfUrl }) {
  const saudacao = nomeCliente ? `Olá ${nomeCliente}!` : 'Olá!';
  const valor = valorTotal != null ? `R$ ${formatBRL(valorTotal)}` : null;
  const linhas = [
    saudacao,
    '',
    `Segue o recibo da sua compra *${codigo}* na *${nomeEmpresa}*${valor ? ` no valor de ${valor}` : ''}.`,
  ];
  if (pdfUrl) {
    linhas.push('', `PDF do recibo: ${pdfUrl}`);
  } else {
    linhas.push('', 'O arquivo PDF do recibo foi gerado no computador da loja para envio em anexo.');
  }
  linhas.push('', 'Qualquer dúvida, responda esta mensagem.');
  return linhas.join('\n');
}

async function uploadReciboPdf(lojaId, codigo, blob) {
  if (!lojaId || !blob) return { url: null, error: null };

  const safeCodigo = String(codigo || 'venda').replace(/[^\w.-]+/g, '_');
  const path = `${lojaId}/recibos/recibo-${safeCodigo}-${Date.now()}.pdf`;

  const { error } = await supabase.storage
    .from('loja-assets')
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    return { url: null, error };
  }

  const { data } = supabase.storage.from('loja-assets').getPublicUrl(path);
  return { url: data?.publicUrl ?? null, error: null };
}

/**
 * Gera PDF, tenta publicar link e abre WhatsApp do cliente.
 * @param {{ lojaId: string, loja: object, venda: object, recibo?: object }} opts
 * venda = registro completo (getVendaById); recibo opcional (mapVendaToRecibo)
 */
export async function enviarReciboPorWhatsApp({ lojaId, loja, venda, recibo: reciboProp = null }) {
  const recibo = reciboProp || mapVendaToRecibo(venda);
  const telefone = telefoneWhatsAppCliente(venda?.cliente)
    || recibo?.telefone
    || '';

  if (!telefone || String(telefone).replace(/\D/g, '').length < 10) {
    return {
      ok: false,
      error: new Error('Cadastre um telefone/WhatsApp válido no cliente para enviar o recibo.'),
    };
  }

  const empresa = {
    razaoSocial: loja?.razao_social || 'Empresa',
    nomeFantasia: loja?.nome_fantasia || loja?.razao_social || 'Loja',
    cnpj: formatCnpj(loja?.cnpj) || loja?.cnpj || '—',
    endereco: [loja?.logradouro, loja?.numero].filter(Boolean).join(', ') || '—',
    cidade: loja?.cidade || '—',
    uf: loja?.estado || '—',
    telefone: loja?.telefone || '—',
    logoUrl: loja?.logo_url || null,
  };

  const pdfResult = await gerarReciboVendaPdf({
    empresa,
    venda: recibo,
    mode: 'blob',
  });

  const { url: pdfUrl } = await uploadReciboPdf(lojaId, recibo.id || venda?.codigo, pdfResult.blob);

  // Se o upload falhar (bucket ainda sem PDF), baixa o arquivo para anexar manualmente.
  if (!pdfUrl && pdfResult.blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfResult.blob);
    a.download = pdfResult.fileName || 'recibo.pdf';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const nomeEmpresa = empresa.nomeFantasia || empresa.razaoSocial;
  const msg = montarMensagemRecibo({
    nomeCliente: recibo.cliente || venda?.cliente?.nome,
    codigo: recibo.id || venda?.codigo,
    nomeEmpresa,
    valorTotal: recibo.valorTotal ?? venda?.valor_total,
    pdfUrl,
  });

  window.open(buildWhatsAppLink(telefone, msg), '_blank', 'noopener,noreferrer');

  return {
    ok: true,
    pdfUrl,
    baixouAnexo: !pdfUrl,
  };
}
