import { describe, expect, it } from 'vitest';
import { buildTermoPrintHtml } from './osTermoPdf';

describe('osTermoPdf', () => {
  it('inclui fotos no HTML de impressão', () => {
    const html = buildTermoPrintHtml({
      titulo: 'Termo de entrada',
      termoTexto: 'Texto do termo',
      assinaturaUrl: 'data:image/png;base64,abc',
      fotosUrls: ['https://example.com/foto1.jpg', 'https://example.com/foto2.jpg'],
      codigoOs: 'OS-0005',
      aceitoEm: '30/07/2026',
    });

    expect(html).toContain('Fotos do aparelho (2)');
    expect(html).toContain('https://example.com/foto1.jpg');
    expect(html).toContain('https://example.com/foto2.jpg');
  });

  it('usa a assinatura registrada quando o termo já foi assinado', () => {
    const html = buildTermoPrintHtml({
      titulo: 'Termo de entrada',
      termoTexto: 'Texto',
      assinaturaUrl: 'data:image/png;base64,abc',
      nomeCliente: 'Maria Souza',
    });

    expect(html).toContain('data:image/png;base64,abc');
    expect(html).not.toContain('<div class="linha-assinatura">');
  });

  it('deixa linha em branco para assinar no balcão quando não há assinatura', () => {
    const html = buildTermoPrintHtml({
      titulo: 'Termo de saída',
      termoTexto: 'Texto',
      assinaturaUrl: null,
      nomeCliente: 'João Lima',
    });

    expect(html).toContain('<div class="linha-assinatura">');
    expect(html).toContain('Assinatura do cliente — João Lima');
    expect(html).toContain('Data: ____ / ____ / ________');
  });

  it('inclui cabeçalho da empresa e identifica a via do cliente', () => {
    const html = buildTermoPrintHtml({
      titulo: 'Termo de entrada',
      termoTexto: 'Texto',
      codigoOs: 'OS-0008',
      empresa: { nome: 'Biscoito Imports', cnpj: '64.951.713/0001-99' },
    });

    expect(html).toContain('Biscoito Imports');
    expect(html).toContain('CNPJ: 64.951.713/0001-99');
    expect(html).toContain('Via do cliente — OS OS-0008');
  });

  it('escapa conteúdo vindo do cadastro para não injetar HTML no documento', () => {
    const html = buildTermoPrintHtml({
      titulo: 'Termo de entrada',
      termoTexto: 'Texto',
      nomeCliente: '<script>alert(1)</script>',
      empresa: { nome: '<b>Loja</b>' },
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;Loja&lt;/b&gt;');
  });
});
