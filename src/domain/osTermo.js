export const TERMO_OS_PADRAO = `TERMO DE ENTRADA — ORDEM DE SERVIÇO

Eu, [NOME_CLIENTE], declaro que entrego o equipamento descrito nesta OS ([CODIGO_OS]) à [NOME_EMPRESA] para diagnóstico e/ou reparo.

1. Estou ciente do estado físico registrado nesta ordem e das fotos anexadas na entrada.
2. Autorizo a realização do diagnóstico e comunicação sobre orçamento de reparo.
3. Reconheço que é minha responsabilidade realizar backup de dados (fotos, contatos, arquivos). A loja não se responsabiliza por perda de dados.
4. Aceito as condições de garantia do serviço conforme política da loja.

Data: [DATA_ENTRADA]`;

export function substituirVariaveisTermo(texto, vars = {}) {
  if (!texto) return '';

  const mapa = {
    '[NOME_EMPRESA]': vars.nomeEmpresa ?? '—',
    '[CNPJ_EMPRESA]': vars.cnpjEmpresa ?? '—',
    '[NOME_CLIENTE]': vars.nomeCliente ?? '—',
    '[CPF_CLIENTE]': vars.cpfCliente ?? '—',
    '[CODIGO_OS]': vars.codigoOs ?? '—',
    '[DATA_ENTRADA]': vars.dataEntrada ?? '—',
    '[MODELO_APARELHO]': vars.modeloAparelho ?? '—',
    '[IMEI]': vars.imei ?? '—',
  };

  let result = texto;
  Object.entries(mapa).forEach(([tag, valor]) => {
    result = result.split(tag).join(valor);
  });

  return result;
}

export async function hashTermoTexto(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function fetchIpCliente() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
