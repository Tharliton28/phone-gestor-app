import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText, ShieldCheck, Download, AlertTriangle, CheckCircle,
  RefreshCw, Settings, FileKey, Coins
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { useErpNavigation } from '../hooks/useErpNavigation';
import { rotuloDocumentoFiscal, rotuloStatusFiscal, statusFiscalEhSucesso } from '../domain/nfce';
import { listDocumentosFiscais } from '../services/fiscalService';
import { getLojaConfigFiscal, mapConfigToFiscal } from '../services/lojaConfigService';
import { getSaldoCreditos } from '../services/lojaCreditoService';
import { formatBRL } from '../utils/formatters';

const PainelFiscal = () => {
  const { alert } = useDialog();
  const { lojaAtivaId } = useLoja();
  const { mudarTela } = useErpNavigation();
  const [docs, setDocs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [fiscal, setFiscal] = useState(null);
  const [saldo, setSaldo] = useState(null);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    const [docsRes, fiscalRes, saldoRes] = await Promise.all([
      listDocumentosFiscais(lojaAtivaId),
      getLojaConfigFiscal(lojaAtivaId),
      getSaldoCreditos(lojaAtivaId),
    ]);

    if (!docsRes.error) setDocs(docsRes.data ?? []);
    if (!fiscalRes.error && fiscalRes.data) setFiscal(mapConfigToFiscal(fiscalRes.data));
    if (!saldoRes.error) setSaldo(saldoRes.saldo);

    setCarregando(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const renderStatus = (status) => {
    if (statusFiscalEhSucesso(status)) {
      return <span style={styles.badgeSuccess}><CheckCircle size={12} /> {rotuloStatusFiscal(status)}</span>;
    }
    if (status === 'rejeitado' || status === 'cancelado') {
      return <span style={styles.badgeError}><AlertTriangle size={12} /> {rotuloStatusFiscal(status)}</span>;
    }
    return <span style={styles.badgeWarning}><RefreshCw size={12} /> {rotuloStatusFiscal(status)}</span>;
  };

  const providerLabel = fiscal?.fiscalProvider === 'mock'
    ? 'Mock (dev)'
    : (fiscal?.fiscalProvider ?? '—');

  return (
    <div style={styles.container}>
      <div style={styles.cardsGrid}>
        <div style={{ ...styles.card, borderLeft: '4px solid #4ade80' }}>
          <div style={styles.cardIconBox}><ShieldCheck size={28} color="#4ade80" /></div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Provedor fiscal</span>
            <span style={styles.cardValue}>{providerLabel}</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
              Ambiente: {fiscal?.nfeAmbiente === 'producao' ? 'Produção' : 'Homologação'}
            </span>
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #3b82f6' }}>
          <div style={styles.cardIconBox}><FileKey size={28} color="#3b82f6" /></div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Numeração NFC-e</span>
            <span style={styles.cardValue}>
              Série {fiscal?.nfceSerie ?? 1} · Nº {fiscal?.nfceUltimoNumero ?? 0}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
              Auto no PDV: {fiscal?.emitirNfceAuto ? 'ligado' : 'desligado'}
            </span>
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #fbbf24' }}>
          <div style={styles.cardIconBox}><Coins size={28} color="#fbbf24" /></div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Créditos da loja</span>
            <span style={styles.cardValue}>{saldo == null ? '—' : `${saldo} créditos`}</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
              NFC-e consome 4 créditos por emissão
            </span>
          </div>
        </div>
      </div>

      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button type="button" style={styles.btnOutline} onClick={carregar} disabled={carregando}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
        <div style={styles.rightActions}>
          <button
            type="button"
            style={styles.btnSettings}
            onClick={() => mudarTela('config', null, { aba: 'fiscal' })}
          >
            <Settings size={14} /> Configurações Fiscais
          </button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <h3 style={styles.tableTitle}>Documentos fiscais recentes</h3>
        {carregando ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Carregando…</p>
        ) : docs.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
            Nenhuma NFC-e ainda. Ligue “Emitir NFC-e automaticamente no PDV” em Configurações → Fiscal
            e conclua uma venda para gerar o primeiro documento (simulado enquanto o provedor for mock).
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Documento</th>
                <th style={styles.th}>Data/Hora</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Protocolo / retorno</th>
                <th style={styles.th}>DANFE</th>
                <th style={styles.th}>Créditos</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((item) => (
                <tr key={item.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 'bold', color: '#e2e8f0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} color="#94a3b8" />
                      {rotuloDocumentoFiscal(item)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    {item.valor_total != null ? formatBRL(item.valor_total) : '—'}
                  </td>
                  <td style={styles.td}>{renderStatus(item.status)}</td>
                  <td style={{
                    ...styles.td,
                    color: item.status === 'rejeitado' ? '#ef4444' : '#94a3b8',
                    whiteSpace: 'normal',
                    maxWidth: 320,
                  }}>
                    {item.protocolo ? `Prot. ${item.protocolo}` : ''}
                    {item.protocolo && item.mensagem ? ' · ' : ''}
                    {item.mensagem || item.chave_acesso || '—'}
                  </td>
                  <td style={styles.td}>
                    {item.caminho_danfe ? (
                      <a
                        href={item.caminho_danfe.startsWith('http')
                          ? item.caminho_danfe
                          : `https://api.focusnfe.com.br${item.caminho_danfe}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', fontSize: 12 }}
                      >
                        Abrir
                      </a>
                    ) : '—'}
                  </td>
                  <td style={styles.td}>{item.consumiu_creditos || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ color: '#64748b', fontSize: '11px', marginTop: 8 }}>
        Exportação contábil de XMLs reais chega com o provedor de produção.
        <button
          type="button"
          style={styles.linkBtn}
          onClick={() => alert('Disponível quando Focus/eNotas estiver conectado.', { type: 'info', title: 'Exportação' })}
        >
          <Download size={12} /> Em breve
        </button>
      </p>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' },
  card: { backgroundColor: '#161925', borderRadius: '6px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' },
  cardIconBox: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardText: { display: 'flex', flexDirection: 'column', flex: 1 },
  cardLabel: { color: '#94a3b8', fontSize: '12px', marginBottom: '4px' },
  cardValue: { color: '#fff', fontSize: '18px', fontWeight: 'bold' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnSettings: { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' },
  tableWrapper: { overflow: 'auto', marginTop: '10px', paddingBottom: '40px' },
  tableTitle: { color: '#e2e8f0', fontSize: '15px', fontWeight: '500', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#e2e8f0', fontSize: '13px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#11131c' },
  badgeSuccess: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeError: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeWarning: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  linkBtn: { marginLeft: 8, background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 },
};

export default PainelFiscal;
