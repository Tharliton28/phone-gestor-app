import React, { useState } from 'react';
import { ArrowLeft, Printer, Download, Share2, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ReciboGarantia = ({ aoVoltar }) => {
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });

  const mostrarAviso = (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    setModalAviso({ aberto: true, titulo, mensagem, tipo, acaoOk });
  };

  return (
    <div style={styles.container} className="app-container-print">
      
      {/* Barra de Ações Superior - some totalmente na impressão */}
      <div style={styles.actionHeader} className="no-print">
        <button onClick={aoVoltar} style={styles.btnBack}>
          <ArrowLeft size={16} /> Voltar para Recibos e Notas
        </button>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline} onClick={() => mostrarAviso('WhatsApp', 'Redirecionando para o WhatsApp Web com o link do recibo...', 'sucesso')}>
            <Share2 size={14} /> Enviar WhatsApp
          </button>
          <button style={styles.btnOutline} onClick={() => window.print()}>
            <Download size={14} /> Baixar PDF
          </button>
          <button style={styles.btnPrimary} onClick={() => window.print()}>
            <Printer size={16} /> Imprimir Recibo
          </button>
        </div>
      </div>

      {/* Área de visualização do Documento */}
      <div style={styles.documentViewer} className="viewer-print-wrapper">
        
        {/* A FOLHA A4 */}
        <div style={styles.a4Page} className="print-area">
          
          {/* Cabeçalho do Recibo */}
          <div style={styles.docHeader}>
            <div style={styles.docHeaderLeft}>
              <h1 style={styles.logoText}>Biscoito<span style={{color: '#d4af37'}}>.</span>Imports</h1>
            </div>
            <div style={styles.docHeaderCenter}>
              <p style={styles.companyInfo}><strong>Biscoito Imports LTDA</strong></p>
              <p style={styles.companyInfo}>Avenida Narciso Pessoa de Araújo, 113, Maracanaú - CE</p>
              <p style={styles.companyInfo}>CNPJ: 64.951.713/0001-13 | Tel: (85) 98822-5506</p>
            </div>
            <div style={styles.docHeaderRight}>
              <p style={styles.docInfo}><strong>DATA:</strong> 03/07/2026</p>
              <p style={styles.docInfo}><strong>VENDEDOR:</strong> Wesley de Sousa</p>
              <p style={styles.docInfo}><strong>RECIBO Nº:</strong> MP0004146187</p>
            </div>
          </div>

          <h2 style={styles.docTitle}>RECIBO DE VENDA E TERMO DE GARANTIA</h2>

          {/* Dados do Cliente */}
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
                <td style={styles.td}>THAIS LOPES</td>
                <td style={styles.td}>(85) 99430-0841</td>
                <td style={styles.td}>000.000.000-00</td>
                <td style={styles.td}>thais@email.com</td>
              </tr>
              <tr>
                <td colSpan="2" style={styles.tdHeader}>Endereço: <span style={styles.tdValue}>Rua das Flores, 123</span></td>
                <td style={styles.tdHeader}>Cidade: <span style={styles.tdValue}>Maracanaú</span></td>
                <td style={styles.tdHeader}>UF: <span style={styles.tdValue}>CE</span></td>
              </tr>
            </tbody>
          </table>

          {/* Dados do Produto */}
          <table style={styles.table}>
            <thead>
              <tr><th colSpan="5" style={styles.thTitle}>DADOS DO PRODUTO</th></tr>
              <tr>
                <th style={{...styles.th, width: '10%'}}>Cód</th>
                <th style={{...styles.th, width: '45%'}}>Descrição do Produto / IMEI</th>
                <th style={{...styles.th, width: '10%', textAlign: 'center'}}>Qtd</th>
                <th style={{...styles.th, width: '15%', textAlign: 'right'}}>Vl. Unitário</th>
                <th style={{...styles.th, width: '20%', textAlign: 'right'}}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>5181678</td>
                <td style={styles.td}>Celular - IPHONE 13 PRO MAX - 128GB - AZUL PACÍFICO<br/>IMEI: 353967815666840</td>
                <td style={{...styles.td, textAlign: 'center'}}>1</td>
                <td style={{...styles.td, textAlign: 'right'}}>R$ 5.500,00</td>
                <td style={{...styles.td, textAlign: 'right'}}>R$ 5.500,00</td>
              </tr>
              <tr>
                <td colSpan="4" style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>TOTAL DOS PRODUTOS:</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>R$ 5.500,00</td>
              </tr>
            </tbody>
          </table>

          {/* Pagamento */}
          <table style={styles.table}>
            <thead>
              <tr><th colSpan="3" style={styles.thTitle}>FORMA DE PAGAMENTO</th></tr>
            </thead>
            <tbody>
              <tr>
                <td style={{...styles.td, width: '30%'}}>APARELHO NA TROCA</td>
                <td style={{...styles.td, width: '45%'}}>iPhone 11 64GB Preto (Avaliação)</td>
                <td style={{...styles.td, width: '25%', textAlign: 'right'}}>R$ 2.000,00</td>
              </tr>
              <tr>
                <td style={styles.td}>PIX</td>
                <td style={styles.td}>Chave CNPJ</td>
                <td style={{...styles.td, textAlign: 'right'}}>R$ 3.500,00</td>
              </tr>
              <tr>
                <td colSpan="2" style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>TOTAL PAGO:</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>R$ 5.500,00</td>
              </tr>
            </tbody>
          </table>

          {/* Cláusulas de Garantia */}
          <div style={styles.legalTextContainer}>
            <h3 style={styles.legalTitle}>TERMO DE GARANTIA E CONDIÇÕES DE COMPRA</h3>
            
            <p style={styles.legalText}>
              <strong>Cláusula 1ª:</strong> O comprador está adquirindo o produto descrito acima, em plenas condições de uso, devidamente testado, concordando com todas as características e estado do item, inexistindo qualquer defeito, mediante valor e forma de pagamento ajustado entre as partes.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 2ª:</strong> Por tratar-se de um aparelho seminovo, todas as informações e características do produto foram repassadas pelo vendedor no ato da compra, não podendo ser extraídas diretamente no site do fabricante.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 3ª (DO PRAZO):</strong> A garantia será de 90 (noventa) dias para defeitos de fabricação (placa), contados a partir da data de recebimento do produto, respeitando o Código de Defesa do Consumidor. A Biscoito Imports não garante a vedação contra água do aparelho.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 4ª (PERDA DE GARANTIA):</strong> A garantia do produto cessará imediatamente nos seguintes casos:
              <br/>- Danos físicos causados por quedas, amassados, arranhões ou pressão excessiva;
              <br/>- Contato com líquidos, umidade ou oxidação de componentes internos;
              <br/>- Rompimento do selo de garantia interno ou externo;
              <br/>- Tentativa de reparo, abertura do aparelho ou alteração de software por terceiros não autorizados;
              <br/>- Mau uso, negligência ou uso de acessórios não originais/homologados (carregadores falsos).
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 5ª:</strong> Em caso de defeito coberto pela garantia, o comprador deverá acionar a loja imediatamente. O prazo para reparo ou substituição do equipamento é de até 30 dias, conforme CDC. Danos em baterias (desgaste natural) não são cobertos após 30 dias.
            </p>
            <p style={styles.legalText}>
              <strong>Cláusula 6ª:</strong> O comprador declara estar ciente de que é sua responsabilidade realizar o backup de seus dados (fotos, contatos, etc). A loja não se responsabiliza por perda de dados durante testes ou reparos.
            </p>
          </div>

          {/* Assinaturas */}
          <div style={styles.signaturesArea}>
            <div style={styles.signatureBox}>
              <div style={styles.signatureLine}></div>
              <p style={styles.signatureName}>THAIS LOPES</p>
              <p style={styles.signatureRole}>Comprador(a) / Cliente</p>
            </div>
            <div style={styles.signatureBox}>
              <div style={styles.signatureLine}></div>
              <p style={styles.signatureName}>Wesley de Sousa</p>
              <p style={styles.signatureRole}>Vendedor / Biscoito Imports</p>
            </div>
          </div>
          
          <div style={styles.footerMsg}>OBRIGADO PELA PREFERÊNCIA!</div>

        </div>
      </div>

      {/* MODAL CUSTOMIZADO PARA AVISOS - AGORA COM CLASSE NO-PRINT */}
      {modalAviso.aberto && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                {modalAviso.tipo === 'sucesso' && <CheckCircle size={18} color="#4ade80" />}
                {modalAviso.tipo === 'erro' && <AlertCircle size={18} color="#ef4444" />}
                {modalAviso.tipo === 'info' && <Info size={18} color="#3b82f6" />}
                {modalAviso.titulo}
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{modalAviso.mensagem}</p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.btnSaveModal, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6', width: '100%'}} 
                onClick={() => {
                  setModalAviso({...modalAviso, aberto: false});
                  if (modalAviso.acaoOk) modalAviso.acaoOk();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ================================================================ */}
      {/* MÁGICA DE IMPRESSÃO INFALÍVEL: MANIPULAÇÃO ESTRUTURAL DA PÁGINA */}
      {/* ================================================================ */}
      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 5mm; 
          }
          
          /* Esconde a Sidebar inteira do App.jsx (primeiro filho do container flex) */
          #root > div > :not(main) { 
            display: none !important; 
          }
          
          /* Esconde a Topbar do App.jsx (primeiro filho do main) */
          main > :not(div) { 
            display: none !important; 
          }
          
          /* ESCONDE O BREADCRUMB DO APP.JSX (qualquer div irmã do recibo) */
          main > div > :not(.app-container-print) {
            display: none !important;
          }

          /* Zera a margem lateral que empurrava a tela para a direita */
          main { 
            margin: 0 !important; 
            width: 100% !important; 
          }
          
          /* Remove a cor de fundo preta e os paddings da área de visualização */
          main > div { 
            background: #ffffff !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          
          /* Esconde todos os nossos próprios botões e modais desta tela */
          .no-print { 
            display: none !important; 
          }
          
          /* Evita a criação da segunda folha em branco removendo o height fixo do sistema */
          html, body, #root, main, main > div, .app-container-print, .viewer-print-wrapper {
            height: auto !important;
            min-height: 0 !important;
            background-color: #ffffff !important;
            overflow: visible !important;
            position: static !important;
          }
          
          /* Formata o Recibo para ocupar a página nativamente no fluxo */
          .print-area { 
            width: 100% !important; 
            max-width: 100% !important; 
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important; 
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0f111a', position: 'relative' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 24px', backgroundColor: '#161925', borderBottom: '1px solid #1f2233' },
  btnBack: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' },
  rightActions: { display: 'flex', gap: '10px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' },
  
  documentViewer: { flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', justifyContent: 'center' },
  
  a4Page: { 
    backgroundColor: '#ffffff', 
    width: '100%',
    maxWidth: '210mm',
    minHeight: '297mm', 
    padding: '15mm', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
    color: '#000000', 
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    margin: '0 auto'
  },
  
  docHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' },
  docHeaderLeft: { width: '30%', display: 'flex', alignItems: 'center' },
  logoText: { fontSize: '24px', margin: 0, fontWeight: '900', letterSpacing: '-1px' },
  docHeaderCenter: { width: '40%', textAlign: 'center' },
  companyInfo: { margin: '2px 0', fontSize: '10px' },
  docHeaderRight: { width: '30%', textAlign: 'right' },
  docInfo: { margin: '2px 0', fontSize: '10px' },

  docTitle: { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', margin: '20px 0', textDecoration: 'underline' },

  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10px' },
  thTitle: { backgroundColor: '#f3f4f6', border: '1px solid #000', padding: '4px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' },
  th: { border: '1px solid #000', padding: '4px', backgroundColor: '#ffffff', fontWeight: 'bold' },
  td: { border: '1px solid #000', padding: '4px' },
  tdHeader: { border: '1px solid #000', padding: '4px', fontWeight: 'bold' },
  tdValue: { fontWeight: 'normal' },

  legalTextContainer: { marginTop: '20px', fontSize: '9px', lineHeight: '1.4', textAlign: 'justify' },
  legalTitle: { fontSize: '11px', fontWeight: 'bold', marginBottom: '10px' },
  legalText: { marginBottom: '8px' },

  signaturesArea: { display: 'flex', justifyContent: 'space-around', marginTop: '60px' },
  signatureBox: { width: '40%', textAlign: 'center' },
  signatureLine: { borderTop: '1px solid #000', marginBottom: '5px' },
  signatureName: { fontSize: '11px', fontWeight: 'bold', margin: '0' },
  signatureRole: { fontSize: '10px', margin: '0' },

  footerMsg: { textAlign: 'center', marginTop: '40px', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnSaveModal: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }
};

export default ReciboGarantia;