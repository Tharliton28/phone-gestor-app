import React, { useMemo } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { formatBRL, formatCnpj, formatCpfCnpj } from '../utils/formatters';

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

const ReciboGarantia = ({ aoVoltar, vendaSelecionada }) => {
  const { lojaAtiva } = useLoja();

  const empresa = useMemo(() => {
    const loja = lojaAtiva ?? {};
    const endereco = [loja.logradouro, loja.numero].filter(Boolean).join(', ');
    return {
      razaoSocial: loja.razao_social || 'Empresa',
      nomeFantasia: loja.nome_fantasia || loja.razao_social || 'Loja',
      cnpj: formatCnpj(loja.cnpj) || '—',
      endereco: endereco || '—',
      cidade: loja.cidade || '—',
      uf: loja.estado || '—',
      telefone: loja.telefone || '—',
      logoUrl: loja.logo_url || null,
    };
  }, [lojaAtiva]);

  const venda = vendaSelecionada;

  if (!venda?.vendaId && !venda?.id) {
    return (
      <div style={styles.container}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ margin: '0 0 16px' }}>Nenhuma venda selecionada para o recibo.</p>
          <button type="button" onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const tituloMarca = empresa.nomeFantasia;

  return (
    <div style={styles.container} className="app-container-print">
      <div style={styles.actionHeader} className="no-print">
        <button onClick={aoVoltar} style={styles.btnBack}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline} onClick={() => window.print()}>
            <Download size={14} /> Baixar PDF
          </button>
          <button style={styles.btnPrimary} onClick={() => window.print()}>
            <Printer size={16} /> Imprimir Recibo
          </button>
        </div>
      </div>

      <div style={styles.documentViewer} className="viewer-print-wrapper">
        <div style={styles.a4Page} className="print-area">
          <div style={styles.docHeader}>
            <div style={styles.docHeaderLeft}>
              {empresa.logoUrl ? (
                <img src={empresa.logoUrl} alt="" style={styles.logoImg} />
              ) : (
                <h1 style={styles.logoText}>{tituloMarca}</h1>
              )}
            </div>
            <div style={styles.docHeaderCenter}>
              <p style={styles.companyInfo}><strong>{empresa.razaoSocial}</strong></p>
              <p style={styles.companyInfo}>{empresa.endereco}, {empresa.cidade} - {empresa.uf}</p>
              <p style={styles.companyInfo}>CNPJ: {empresa.cnpj} | Tel: {empresa.telefone}</p>
            </div>
            <div style={styles.docHeaderRight}>
              <p style={styles.docInfo}><strong>DATA:</strong> {formatDataRecibo(venda.data)}</p>
              <p style={styles.docInfo}><strong>VENDEDOR:</strong> {venda.vendedor || '—'}</p>
              <p style={styles.docInfo}><strong>RECIBO Nº:</strong> {venda.id ?? venda.vendaId}</p>
            </div>
          </div>

          <h2 style={styles.docTitle}>RECIBO DE VENDA E TERMO DE GARANTIA</h2>

          <table style={styles.table}>
            <thead>
              <tr><th colSpan="4" style={styles.thTitle}>DESTINATÁRIO / COMPRADOR</th></tr>
              <tr>
                <th style={styles.th}>Nome/Razão Social</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>CPF/CNPJ</th>
                <th style={styles.th}>E-mail</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>{venda.cliente}</td>
                <td style={styles.td}>{venda.telefone || '—'}</td>
                <td style={styles.td}>{formatCpfCnpj(venda.cpf) || '—'}</td>
                <td style={styles.td}>{venda.email || 'Não informado'}</td>
              </tr>
              <tr>
                <td colSpan="2" style={styles.tdHeader}>
                  Endereço: <span style={styles.tdValue}>{venda.endereco || 'Não informado'}</span>
                </td>
                <td style={styles.tdHeader}>
                  Cidade: <span style={styles.tdValue}>{venda.cidade || '-'}</span>
                </td>
                <td style={styles.tdHeader}>
                  UF: <span style={styles.tdValue}>{venda.uf || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <table style={styles.table}>
            <thead>
              <tr><th colSpan="5" style={styles.thTitle}>DADOS DO PRODUTO</th></tr>
              <tr>
                <th style={{ ...styles.th, width: '10%' }}>Cód</th>
                <th style={{ ...styles.th, width: '45%' }}>Descrição do Produto / IMEI</th>
                <th style={{ ...styles.th, width: '10%', textAlign: 'center' }}>Qtd</th>
                <th style={{ ...styles.th, width: '15%', textAlign: 'right' }}>Vl. Unitário</th>
                <th style={{ ...styles.th, width: '20%', textAlign: 'right' }}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {(venda.produtos ?? []).map((prod, index) => (
                <tr key={prod.id ?? index}>
                  <td style={styles.td}>{String(prod.id ?? '').slice(0, 8)}</td>
                  <td style={styles.td}>
                    {prod.descricao}
                    {prod.imei ? <><br />IMEI: {prod.imei}</> : null}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{prod.qtd}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>R$ {money(prod.valorUnitario)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>R$ {money(prod.valorTotal)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                  TOTAL DOS PRODUTOS:
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                  R$ {money(venda.valorTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={styles.table}>
            <thead>
              <tr><th colSpan="3" style={styles.thTitle}>FORMA DE PAGAMENTO</th></tr>
            </thead>
            <tbody>
              {(venda.pagamentos ?? []).map((pag, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, width: '30%' }}>{pag.forma}</td>
                  <td style={{ ...styles.td, width: '45%' }}>{pag.detalhes}</td>
                  <td style={{ ...styles.td, width: '25%', textAlign: 'right' }}>R$ {money(pag.valor)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="2" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                  TOTAL PAGO:
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                  R$ {money(venda.valorTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={styles.legalTextContainer}>
            <h3 style={styles.legalTitle}>TERMO DE GARANTIA E CONDIÇÕES DE COMPRA</h3>
            <p style={styles.legalText}>
              <strong>Cláusula 1ª:</strong> O comprador está adquirindo o produto descrito acima, em plenas condições de uso, devidamente testado, concordando com todas as características e estado do item, inexistindo qualquer defeito, mediante valor e forma de pagamento ajustado entre as partes.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 2ª:</strong> Por tratar-se de um aparelho seminovo, todas as informações e características do produto foram repassadas pelo vendedor no ato da compra, não podendo ser extraídas diretamente no site do fabricante.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 3ª (DO PRAZO):</strong> A garantia será de 90 (noventa) dias para defeitos de fabricação (placa), contados a partir da data de recebimento do produto, respeitando o Código de Defesa do Consumidor. A {empresa.nomeFantasia} não garante a vedação contra água do aparelho.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 4ª (PERDA DE GARANTIA):</strong> A garantia do produto cessará imediatamente nos seguintes casos:
              <br />- Danos físicos causados por quedas, amassados, arranhões ou pressão excessiva;
              <br />- Contato com líquidos, umidade ou oxidação de componentes internos;
              <br />- Rompimento do selo de garantia interno ou externo;
              <br />- Tentativa de reparo, abertura do aparelho ou alteração de software por terceiros não autorizados;
              <br />- Mau uso, negligência ou uso de acessórios não originais/homologados (carregadores falsos).
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 5ª:</strong> Em caso de defeito coberto pela garantia, o comprador deverá acionar a loja imediatamente. O prazo para reparo ou substituição do equipamento é de até 30 dias, conforme CDC. Danos em baterias (desgaste natural) não são cobertos após 30 dias.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 6ª:</strong> O comprador declara estar ciente de que é sua responsabilidade realizar o backup de seus dados (fotos, contatos, etc). A loja não se responsabiliza por perda de dados durante testes ou reparos.
            </p>
          </div>

          <div style={styles.signaturesArea}>
            <div style={styles.signatureBox}>
              <div style={styles.signatureLine}></div>
              <p style={styles.signatureName}>{venda.cliente}</p>
              <p style={styles.signatureRole}>Comprador(a) / Cliente</p>
            </div>
            <div style={styles.signatureBox}>
              <div style={styles.signatureLine}></div>
              <p style={styles.signatureName}>{venda.vendedor}</p>
              <p style={styles.signatureRole}>Vendedor / {empresa.nomeFantasia}</p>
            </div>
          </div>

          <div style={styles.footerMsg}>OBRIGADO PELA PREFERÊNCIA!</div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b0d14' },
  actionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '15px 20px', borderBottom: '1px solid #1f2233', backgroundColor: '#12141f',
  },
  rightActions: { display: 'flex', gap: '10px' },
  btnBack: {
    backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  btnOutline: {
    backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  btnPrimary: {
    backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px',
    borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    gap: '6px', fontSize: '13px', fontWeight: 'bold',
  },
  documentViewer: {
    flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', justifyContent: 'center',
    backgroundColor: '#0b0d14',
  },
  a4Page: {
    width: '210mm', minHeight: '297mm', backgroundColor: '#fff', color: '#000',
    padding: '15mm', boxShadow: '0 0 20px rgba(0,0,0,0.5)', boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif', fontSize: '11px',
  },
  docHeader: {
    display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000',
    paddingBottom: '10px', marginBottom: '15px', gap: '12px',
  },
  docHeaderLeft: { width: '25%', display: 'flex', alignItems: 'center' },
  docHeaderCenter: { width: '45%', textAlign: 'center' },
  docHeaderRight: { width: '30%', textAlign: 'right' },
  logoText: { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#111' },
  logoImg: { maxWidth: '90px', maxHeight: '70px', objectFit: 'contain' },
  companyInfo: { margin: '2px 0', fontSize: '10px' },
  docInfo: { margin: '2px 0', fontSize: '10px' },
  docTitle: {
    textAlign: 'center', fontSize: '14px', fontWeight: 'bold', margin: '15px 0',
    textDecoration: 'underline',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '10px' },
  thTitle: {
    backgroundColor: '#eee', border: '1px solid #000', padding: '4px', textAlign: 'left',
    fontWeight: 'bold',
  },
  th: { border: '1px solid #000', padding: '4px', textAlign: 'left', backgroundColor: '#f9f9f9' },
  td: { border: '1px solid #000', padding: '4px', verticalAlign: 'top' },
  tdHeader: { border: '1px solid #000', padding: '4px', fontWeight: 'bold' },
  tdValue: { fontWeight: 'normal' },
  legalTextContainer: { marginTop: '20px', fontSize: '9px', textAlign: 'justify' },
  legalTitle: { fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' },
  legalText: { marginBottom: '6px', lineHeight: '1.4' },
  signaturesArea: {
    display: 'flex', justifyContent: 'space-between', marginTop: '40px', padding: '0 20px',
  },
  signatureBox: { width: '40%', textAlign: 'center' },
  signatureLine: { borderTop: '1px solid #000', marginBottom: '5px' },
  signatureName: { margin: '0', fontWeight: 'bold', fontSize: '10px' },
  signatureRole: { margin: '0', fontSize: '9px' },
  footerMsg: {
    textAlign: 'center', marginTop: '30px', fontWeight: 'bold', fontSize: '12px',
  },
};

export default ReciboGarantia;
