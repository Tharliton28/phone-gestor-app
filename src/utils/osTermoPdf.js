function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildTermoPrintHtml({
  titulo,
  termoTexto,
  assinaturaUrl,
  fotosUrls = [],
  codigoOs,
  aceitoEm,
  ipCliente,
  cpfCliente,
  origemAssinatura,
  empresa,
  nomeCliente,
}) {
  const fotosHtml = fotosUrls.length > 0
    ? `<div class="fotos">
        <strong>Fotos do aparelho (${fotosUrls.length}):</strong>
        <div class="fotos-grid">
          ${fotosUrls.map((url, i) => `<img src="${url}" alt="Foto ${i + 1}" />`).join('')}
        </div>
      </div>`
    : '';

  const cabecalhoEmpresa = empresa?.nome
    ? `<div class="empresa">
        <strong>${escapeHtml(empresa.nome)}</strong>
        ${empresa.cnpj ? `<br/>CNPJ: ${escapeHtml(empresa.cnpj)}` : ''}
      </div>`
    : '';

  // Sem assinatura digital o documento vira via para assinar à mão no balcão.
  const assinaturaHtml = assinaturaUrl
    ? `<div class="assinatura"><strong>Assinatura:</strong><br/><img src="${assinaturaUrl}" alt="Assinatura" /></div>`
    : `<div class="assinatura">
        <div class="linha-assinatura"></div>
        <div class="legenda-assinatura">Assinatura do cliente${nomeCliente ? ` — ${escapeHtml(nomeCliente)}` : ''}</div>
        <div class="legenda-assinatura">Data: ____ / ____ / ________</div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(titulo)} — ${escapeHtml(codigoOs ?? '')}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 20px; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
    .fotos { margin-top: 24px; page-break-inside: avoid; }
    .fotos-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .fotos-grid img { width: 140px; height: 140px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; }
    .assinatura { margin-top: 32px; page-break-inside: avoid; }
    .assinatura img { max-width: 320px; border: 1px solid #ccc; border-radius: 4px; }
    .empresa { font-size: 13px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #ddd; }
    .linha-assinatura { border-bottom: 1px solid #111; width: 320px; margin-top: 40px; }
    .legenda-assinatura { font-size: 12px; color: #555; margin-top: 6px; }
    .rodape { margin-top: 28px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${cabecalhoEmpresa}
  <h1>${escapeHtml(titulo)}${codigoOs ? ` — ${escapeHtml(codigoOs)}` : ''}</h1>
  <div class="meta">
    ${nomeCliente ? `Cliente: ${escapeHtml(nomeCliente)}<br/>` : ''}
    ${aceitoEm ? `Registrado em: ${escapeHtml(aceitoEm)}<br/>` : ''}
    ${ipCliente ? `IP: ${escapeHtml(ipCliente)}<br/>` : ''}
    ${cpfCliente ? `CPF: ${escapeHtml(cpfCliente)}<br/>` : ''}
    ${origemAssinatura ? `Origem: ${origemAssinatura === 'cliente' ? 'Dispositivo do cliente' : 'Balcão da loja'}` : ''}
  </div>
  <pre>${escapeHtml(termoTexto)}</pre>
  ${fotosHtml}
  ${assinaturaHtml}
  <div class="rodape">Via do cliente${codigoOs ? ` — OS ${escapeHtml(codigoOs)}` : ''} · Emitida em ${new Date().toLocaleString('pt-BR')}</div>
  <script>
    window.onload = function() {
      var imgs = Array.prototype.slice.call(document.querySelectorAll('img'));
      var waits = imgs.map(function(img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function(resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      Promise.all(waits).then(function() {
        setTimeout(function() { window.print(); }, 150);
      });
    };
    window.onafterprint = function() { window.close(); };
  </script>
</body>
</html>`;
}

/**
 * URLs assinadas do Storage não carregam no contexto de impressão: converte para
 * base64 para que as fotos apareçam no documento.
 */
export async function carregarImagensParaImpressao(urls = []) {
  const convertidas = await Promise.all(
    urls.map(async (url) => {
      if (!url) return null;
      if (url.startsWith('data:')) return url;

      try {
        const res = await fetch(url);
        if (!res.ok) return url;

        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      } catch {
        return url;
      }
    })
  );

  return convertidas.filter(Boolean);
}

const TITULO_VIA = { entrada: 'Termo de entrada', saida: 'Termo de saída' };

/** Monta o HTML da via (com fotos em base64). Usado para imprimir e arquivar. */
export async function montarHtmlViaCliente({
  tipo = 'entrada',
  termo = null,
  fotos = [],
  assinaturaUrl = null,
  termoTextoFallback = '',
  codigoOs,
  nomeCliente,
  empresa,
}) {
  const termoTexto = termo?.termo_texto ?? termoTextoFallback;

  if (!termoTexto) {
    return { html: null, error: new Error('Termo sem conteúdo para impressão.') };
  }

  const fotosUrls = await carregarImagensParaImpressao((fotos ?? []).map((foto) => foto.url));
  let assinaturaEmbutida = assinaturaUrl;
  if (assinaturaUrl && !assinaturaUrl.startsWith('data:')) {
    const [convertida] = await carregarImagensParaImpressao([assinaturaUrl]);
    assinaturaEmbutida = convertida ?? assinaturaUrl;
  }

  const html = buildTermoPrintHtml({
    titulo: TITULO_VIA[tipo] ?? TITULO_VIA.entrada,
    termoTexto,
    assinaturaUrl: assinaturaEmbutida,
    fotosUrls,
    codigoOs,
    nomeCliente,
    empresa,
    aceitoEm: termo?.aceito_em ? new Date(termo.aceito_em).toLocaleString('pt-BR') : null,
    ipCliente: termo?.ip_cliente,
    cpfCliente: termo?.cpf_cliente,
    origemAssinatura: termo?.origem_assinatura,
  });

  return { html, error: null, assinado: Boolean(termo) };
}

/**
 * Imprime a via do cliente. Serve tanto para termo já assinado (sai com a
 * assinatura registrada e os dados de auditoria) quanto para termo ainda não
 * assinado (sai com linha em branco, para assinar no balcão).
 */
export async function imprimirViaCliente(params) {
  const { html, error, assinado } = await montarHtmlViaCliente(params);
  if (!html) return { ok: false, error, assinado: false };

  imprimirTermoPdfHtml(html);
  return { ok: true, assinado, html };
}

/** Imprime via iframe oculto — evita aba about:blank presa no navegador. */
export function imprimirTermoPdf(params) {
  return imprimirTermoPdfHtml(buildTermoPrintHtml(params));
}

export function imprimirTermoPdfHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Impressão termo OS');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return false;
  }

  const limpar = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  win.onafterprint = limpar;
  win.addEventListener('afterprint', limpar);

  const aguardarImagensEImprimir = () => {
    const imgs = [...doc.querySelectorAll('img')];
    Promise.all(
      imgs.map(
        (img) => (img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }))
      )
    ).then(() => {
      setTimeout(() => {
        win.focus();
        win.print();
        setTimeout(limpar, 2000);
      }, 200);
    });
  };

  if (doc.readyState === 'complete') {
    aguardarImagensEImprimir();
  } else {
    iframe.onload = aguardarImagensEImprimir;
  }

  return true;
}
