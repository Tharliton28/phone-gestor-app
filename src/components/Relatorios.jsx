import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart2, RefreshCw, TrendingUp, Users, Percent, FileText, AlertCircle,
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { formatBRL } from '../utils/formatters';
import { periodoPadrao } from '../domain/relatorioCalculos';
import { getRelatoriosDashboard } from '../services/relatorioService';

const ABAS = [
  { id: 'vendas', label: 'Vendas', icon: TrendingUp },
  { id: 'taxas', label: 'Taxas', icon: Percent },
  { id: 'funil', label: 'Orçamentos', icon: FileText },
];

const STATUS_FUNIL = [
  { key: 'pendente', label: 'Pendentes', cor: '#fbbf24' },
  { key: 'aprovado', label: 'Aprovados', cor: '#38bdf8' },
  { key: 'convertido', label: 'Convertidos', cor: '#4ade80' },
  { key: 'expirado', label: 'Expirados', cor: '#94a3b8' },
  { key: 'rejeitado', label: 'Rejeitados', cor: '#ef4444' },
];

function CardKpi({ titulo, valor, subtitulo, cor = '#38bdf8' }) {
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiTitulo}>{titulo}</span>
      <strong style={{ ...styles.kpiValor, color: cor }}>{valor}</strong>
      {subtitulo && <span style={styles.kpiSub}>{subtitulo}</span>}
    </div>
  );
}

export default function Relatorios() {
  const { lojaAtivaId } = useLoja();
  const [aba, setAba] = useState('vendas');
  const [periodo, setPeriodo] = useState(periodoPadrao());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data, error } = await getRelatoriosDashboard(lojaAtivaId, periodo);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar relatórios.');
      setDados(null);
    } else {
      setDados(data);
    }

    setLoading(false);
  }, [lojaAtivaId, periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resumo = dados?.vendas?.resumo;
  const porVendedor = dados?.vendas?.porVendedor ?? [];
  const taxas = dados?.taxas;
  const funil = dados?.funil;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.titulo}>
            <BarChart2 size={22} color="#38bdf8" style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Relatórios
          </h2>
          <p style={styles.subtitulo}>Visão gerencial da loja — vendas, taxas e funil de orçamentos.</p>
        </div>
        <button style={styles.btnOutline} type="button" onClick={carregar} disabled={loading}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div style={styles.filtros}>
        <div style={styles.filtroGroup}>
          <label style={styles.label}>De</label>
          <input
            type="date"
            style={styles.input}
            value={periodo.dataInicio}
            onChange={(e) => setPeriodo((p) => ({ ...p, dataInicio: e.target.value }))}
          />
        </div>
        <div style={styles.filtroGroup}>
          <label style={styles.label}>Até</label>
          <input
            type="date"
            style={styles.input}
            value={periodo.dataFim}
            onChange={(e) => setPeriodo((p) => ({ ...p, dataFim: e.target.value }))}
          />
        </div>
      </div>

      <div style={styles.tabs}>
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            style={aba === id ? styles.tabActive : styles.tab}
            onClick={() => setAba(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {erro && (
        <div style={styles.erroBox}>
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {loading && (
        <div style={styles.loading}>Carregando relatórios...</div>
      )}

      {!loading && !erro && aba === 'vendas' && (
        <>
          <div style={styles.kpiGrid}>
            <CardKpi titulo="Vendas concluídas" valor={resumo?.quantidade ?? 0} cor="#4ade80" />
            <CardKpi titulo="Faturamento" valor={formatBRL(resumo?.faturamento ?? 0)} cor="#38bdf8" />
            <CardKpi titulo="Ticket médio" valor={formatBRL(resumo?.ticketMedio ?? 0)} cor="#fbbf24" />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Users size={16} /> Por vendedor
            </h3>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Vendedor</th>
                    <th style={styles.th}>Qtd</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porVendedor.length === 0 && (
                    <tr>
                      <td colSpan={3} style={styles.empty}>Nenhuma venda no período.</td>
                    </tr>
                  )}
                  {porVendedor.map((row) => (
                    <tr key={row.vendedor} style={styles.tr}>
                      <td style={styles.td}>{row.vendedor}</td>
                      <td style={styles.td}>{row.quantidade}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                        {formatBRL(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !erro && aba === 'taxas' && (
        <>
          <div style={styles.kpiGrid}>
            <CardKpi
              titulo="Taxas repassadas ao cliente"
              valor={formatBRL(taxas?.taxaRepassadaCliente ?? 0)}
              subtitulo="Acréscimo cobrado no PDV"
              cor="#fbbf24"
            />
            <CardKpi
              titulo="Custo estimado operadora"
              valor={formatBRL(taxas?.custoOperadoraEstimado ?? 0)}
              subtitulo="Descontado do repasse"
              cor="#ef4444"
            />
            <CardKpi
              titulo="Impacto líquido (repasse − custo)"
              valor={formatBRL(taxas?.impactoLiquido ?? 0)}
              subtitulo={`Volume cartão: ${formatBRL(taxas?.volumeCartao ?? 0)}`}
              cor={Number(taxas?.impactoLiquido ?? 0) >= 0 ? '#4ade80' : '#ef4444'}
            />
          </div>

          <p style={styles.nota}>
            Estimativa com base nos pagamentos registrados nas vendas do período (taxa repassada e percentual da forma).
          </p>
        </>
      )}

      {!loading && !erro && aba === 'funil' && (
        <>
          <div style={styles.kpiGrid}>
            <CardKpi titulo="Orçamentos no período" valor={funil?.total ?? 0} cor="#38bdf8" />
            <CardKpi
              titulo="Taxa de conversão"
              valor={`${Number(funil?.taxaConversao ?? 0).toFixed(1)}%`}
              subtitulo={`${funil?.contagem?.convertido ?? 0} convertidos`}
              cor="#4ade80"
            />
            <CardKpi
              titulo="Valor convertido"
              valor={formatBRL(funil?.valorConvertido ?? 0)}
              subtitulo={`De ${formatBRL(funil?.valorTotal ?? 0)} orçados`}
              cor="#fbbf24"
            />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Funil por status</h3>
            <div style={styles.funilGrid}>
              {STATUS_FUNIL.map(({ key, label, cor }) => {
                const qtd = funil?.contagem?.[key] ?? 0;
                const pct = funil?.total ? Math.round((qtd / funil.total) * 100) : 0;

                return (
                  <div key={key} style={styles.funilItem}>
                    <div style={styles.funilHeader}>
                      <span style={{ color: cor, fontWeight: 'bold' }}>{label}</span>
                      <span style={styles.funilQtd}>{qtd}</span>
                    </div>
                    <div style={styles.funilBarTrack}>
                      <div style={{ ...styles.funilBarFill, width: `${pct}%`, backgroundColor: cor }} />
                    </div>
                    <span style={styles.funilPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' },
  titulo: { color: '#fff', fontSize: '20px', margin: '0 0 6px 0', display: 'flex', alignItems: 'center' },
  subtitulo: { color: '#94a3b8', fontSize: '13px', margin: 0 },
  btnOutline: {
    backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  filtros: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  filtroGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#94a3b8', fontSize: '12px' },
  input: {
    backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '8px 12px', color: '#fff', fontSize: '13px',
  },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: {
    backgroundColor: '#11131c', border: '1px solid #2a2e3f', color: '#94a3b8',
    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '8px', fontSize: '13px',
  },
  tabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid #38bdf8', color: '#38bdf8',
    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold',
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  kpiCard: {
    backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '10px',
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px',
  },
  kpiTitulo: { color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  kpiValor: { fontSize: '24px', fontWeight: 'bold' },
  kpiSub: { color: '#64748b', fontSize: '11px' },
  section: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '10px', padding: '20px' },
  sectionTitle: { color: '#e2e8f0', fontSize: '15px', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'left', borderBottom: '1px solid #1f2233' },
  td: { padding: '12px', color: '#e2e8f0', fontSize: '13px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c' },
  empty: { textAlign: 'center', padding: '24px', color: '#64748b' },
  funilGrid: { display: 'flex', flexDirection: 'column', gap: '14px' },
  funilItem: { display: 'grid', gridTemplateColumns: '140px 1fr 40px', alignItems: 'center', gap: '12px' },
  funilHeader: { display: 'flex', flexDirection: 'column', gap: '2px' },
  funilQtd: { color: '#e2e8f0', fontSize: '18px', fontWeight: 'bold' },
  funilBarTrack: { height: '8px', backgroundColor: '#0f111a', borderRadius: '4px', overflow: 'hidden' },
  funilBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  funilPct: { color: '#64748b', fontSize: '12px', textAlign: 'right' },
  nota: { color: '#64748b', fontSize: '12px', margin: 0, lineHeight: 1.5 },
  loading: { color: '#94a3b8', textAlign: 'center', padding: '40px' },
  erroBox: {
    display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
  },
};
