import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBRL, formatCpfCnpj } from './formatters';

function formatDataRecibo(value) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    const [y, m, d] = String(value).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return String(value);
}

function money(value) {
  if (value == null || value === '') return '0,00';
  if (typeof value === 'string' && value.includes(',')) return value;
  return formatBRL(value);
}

async function loadImageAsDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: tenta via Image (pode falhar por CORS)
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

function detectImageFormat(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'PNG';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

const CLAUSULAS = [
  'Cláusula 1ª: O comprador está adquirindo o produto descrito acima, em plenas condições de uso, devidamente testado, concordando com todas as características e estado do item, inexistindo qualquer defeito, mediante valor e forma de pagamento ajustado entre as partes.',
  'Cláusula 2ª: Por tratar-se de um aparelho seminovo, todas as informações e características do produto foram repassadas pelo vendedor no ato da compra, não podendo ser extraídas diretamente no site do fabricante.',
  'Cláusula 3ª (DO PRAZO): A garantia será de 90 (noventa) dias para defeitos de fabricação (placa), contados a partir da data de recebimento do produto, respeitando o Código de Defesa do Consumidor. A {LOJA} não garante a vedação contra água do aparelho.',
  'Cláusula 4ª (PERDA DE GARANTIA): A garantia cessará imediatamente em caso de danos físicos, contato com líquidos, rompimento de selo, reparo por terceiros não autorizados ou mau uso/acessórios não homologados.',
  'Cláusula 5ª: Em caso de defeito coberto, o comprador deverá acionar a loja imediatamente. Prazo para reparo ou substituição: até 30 dias (CDC). Desgaste natural de bateria após 30 dias não é coberto.',
  'Cláusula 6ª: O comprador declara ciência de que o backup de dados é de sua responsabilidade. A loja não se responsabiliza por perda de dados em testes ou reparos.',
];

/**
 * Gera PDF A4 do recibo/garantia — sem cabeçalho do navegador.
 * @param {{ empresa: object, venda: object, mode?: 'download' | 'print' }} opts
 */
export async function gerarReciboVendaPdf({ empresa, venda, mode = 'download' }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 12;

  const nomeFantasia = empresa.nomeFantasia || empresa.razaoSocial || 'Loja';
  const razao = empresa.razaoSocial || nomeFantasia;
  const enderecoLinha = [empresa.endereco, empresa.cidade, empresa.uf]
    .filter((p) => p && p !== '—')
    .join(', ') || '—';
  const cnpjTel = `CNPJ: ${empresa.cnpj || '—'} | Tel: ${empresa.telefone || '—'}`;
  const numero = String(venda.id ?? venda.vendaId ?? '');

  const logoData = await loadImageAsDataUrl(empresa.logoUrl);
  if (logoData) {
    const fmt = detectImageFormat(logoData);
    try {
      doc.addImage(logoData, fmt, margin, y, 28, 28);
    } catch {
      try {
        doc.addImage(logoData, 'PNG', margin, y, 28, 28);
      } catch {
        /* sem logo */
      }
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(nomeFantasia, margin, y + 10);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(razao, pageW / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(enderecoLinha, pageW / 2, y + 11, { align: 'center' });
  doc.text(cnpjTel, pageW / 2, y + 16, { align: 'center' });

  doc.setFontSize(8);
  const metaX = pageW - margin;
  doc.text(`DATA: ${formatDataRecibo(venda.data)}`, metaX, y + 6, { align: 'right' });
  doc.text(`VENDEDOR: ${venda.vendedor || '—'}`, metaX, y + 11, { align: 'right' });
  doc.text(`RECIBO Nº: ${numero}`, metaX, y + 16, { align: 'right' });

  y = 44;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RECIBO DE VENDA E TERMO DE GARANTIA', pageW / 2, y, { align: 'center' });
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: 20 },
    headStyles: { fillColor: [238, 238, 238], textColor: 0, fontStyle: 'bold' },
    head: [
      [{ content: 'DESTINATÁRIO / COMPRADOR', colSpan: 4, styles: { halign: 'left' } }],
      ['Nome/Razão Social', 'Telefone', 'CPF/CNPJ', 'E-mail'],
    ],
    body: [
      [
        venda.cliente || '—',
        venda.telefone || '—',
        formatCpfCnpj(venda.cpf) || '—',
        venda.email || 'Não informado',
      ],
      [
        { content: `Endereço: ${venda.endereco || 'Não informado'}`, colSpan: 2 },
        `Cidade: ${venda.cidade || '-'}`,
        `UF: ${venda.uf || '-'}`,
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 4;

  const produtos = (venda.produtos ?? []).map((p) => [
    String(p.id ?? '').slice(0, 8),
    `${p.descricao || ''}${p.imei ? `\nIMEI: ${p.imei}` : ''}`,
    String(p.qtd ?? ''),
    `R$ ${money(p.valorUnitario)}`,
    `R$ ${money(p.valorTotal)}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: 20 },
    headStyles: { fillColor: [238, 238, 238], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 18 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
    head: [
      [{ content: 'DADOS DO PRODUTO', colSpan: 5, styles: { halign: 'left' } }],
      ['Cód', 'Descrição / IMEI', 'Qtd', 'Vl. Unitário', 'Valor Total'],
    ],
    body: [
      ...produtos,
      [
        { content: 'TOTAL DOS PRODUTOS:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `R$ ${money(venda.valorTotal)}`, styles: { halign: 'right', fontStyle: 'bold' } },
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 4;

  const pags = (venda.pagamentos ?? []).map((p) => [
    p.forma || '—',
    p.detalhes || '',
    `R$ ${money(p.valor)}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: 20 },
    headStyles: { fillColor: [238, 238, 238], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right', cellWidth: 32 },
    },
    head: [[{ content: 'FORMA DE PAGAMENTO', colSpan: 3, styles: { halign: 'left' } }]],
    body: [
      ...pags,
      [
        { content: 'TOTAL PAGO:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `R$ ${money(venda.valorTotal)}`, styles: { halign: 'right', fontStyle: 'bold' } },
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TERMO DE GARANTIA E CONDIÇÕES DE COMPRA', pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const maxW = pageW - margin * 2;
  for (const raw of CLAUSULAS) {
    const texto = raw.replace('{LOJA}', nomeFantasia);
    const lines = doc.splitTextToSize(texto, maxW);
    if (y + lines.length * 3.2 > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 14;
    }
    doc.text(lines, margin, y);
    y += lines.length * 3.2 + 2;
  }

  y += 8;
  if (y > doc.internal.pageSize.getHeight() - 35) {
    doc.addPage();
    y = 30;
  }

  const colW = (pageW - margin * 2 - 20) / 2;
  const leftX = margin + 10;
  const rightX = margin + 20 + colW;

  doc.setDrawColor(0);
  doc.line(leftX, y, leftX + colW, y);
  doc.line(rightX, y, rightX + colW, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(venda.cliente || 'Cliente', leftX + colW / 2, y + 5, { align: 'center' });
  doc.text(venda.vendedor || 'Vendedor', rightX + colW / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Comprador(a) / Cliente', leftX + colW / 2, y + 9, { align: 'center' });
  doc.text(`Vendedor / ${nomeFantasia}`, rightX + colW / 2, y + 9, { align: 'center' });

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OBRIGADO PELA PREFERÊNCIA!', pageW / 2, y, { align: 'center' });

  const fileName = `recibo-${numero || 'venda'}.pdf`;

  if (mode === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      doc.save(fileName);
      return { ok: true, fallbackDownload: true };
    }
    return { ok: true };
  }

  doc.save(fileName);
  return { ok: true };
}
