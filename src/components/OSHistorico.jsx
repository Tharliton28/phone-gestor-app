import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History, Search, RefreshCw, ExternalLink, CheckCircle, Ban, Eye, Eraser,
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { formatBRL } from '../utils/formatters';
import { periodoPadrao } from '../domain/relatorioCalculos';
import {
  calcResumoHistorico,
  dataReferenciaHistorico,
  filtrarOsHistorico,
} from '../domain/osHistorico';
import {
  listOrdensServicoHistorico,
  STATUS_COLORS,
  STATUS_LABEL,
} from '../services/osService';
import { formatDataBR } from '../services/orcamentoService';

function resumoServico(os) {
  const relato = os.relato_cliente?.trim();
  if (relato) return relato.length > 60 ? `${relato.slice(0, 60)}…` : relato;
  return '—';
}

export default function OSHistorico({ aoMudarTela }) {
  const { lojaAtivaId } = useLoja();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [periodo, setPeriodo] = useState(periodoPadrao());
  const [busca, setBusca] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data, error } = await listOrdensServicoHistorico(lojaAtivaId);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar histórico de OS.');
      setOrdens([]);
    } else {
      setOrdens(data ?? []);
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tecnicos = useMemo(() => {
    const map = new Map();
    ordens.forEach((os) => {
      if (os.tecnico?.id) map.set(os.tecnico.id, os.tecnico.nome);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [ordens]);

  const ordensFiltradas = useMemo(
    () => filtrarOsHistorico(ordens, {
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
      busca,
      tecnicoId: filtroTecnico,
      status: filtroStatus,
    }),
    [ordens, periodo, busca, filtroTecnico, filtroStatus]
  );

  const resumo = useMemo(() => calcResumoHistorico(ordensFiltradas), [ordensFiltradas]);

  const limparFiltros = () => {
    setPeriodo(periodoPadrao());
    setBusca('');
    setFiltroTecnico('todos');
    setFiltroStatus('todos');
  };

  const verOS = (os) => {
    if (aoMudarTela) {
      aoMudarTela('nova-os', 'historico-os', { osId: os.id });
    }
  };

  const renderStatus = (status) => {
    const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.aberta;
    return (
      <span
        style={{
          color: cfg.color,
          backgroundColor: cfg.bg,
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.titulo}>
            <History size={22} color="#38bdf8" style={{ marginRight: '10px' }} />
            Histórico de OS
          </h2>
          <p style={styles.subtitulo}>Ordens finalizadas e canceladas — consulta por período, cliente e técnico.</p>
        </div>
        <div style={styles.topActions}>
          <button
            type="button"
            style={styles.btnOutline}
            onClick={() => aoMudarTela?.('listagem-os', 'historico-os')}
          >
            <ExternalLink size={14} /> OS ativas
          </button>
          <button type="button" style={styles.btnOutline} onClick={carregar} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <CheckCircle size={22} color="#4ade80" />
          <div>
            <div style={styles.metricLabel}>Finalizadas</div>
            <div style={{ ...styles.metricValue, color: '#4ade80' }}>{resumo.finalizadas}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <Ban size={22} color="#ef4444" />
          <div>
            <div style={styles.metricLabel}>Canceladas</div>
            <div style={{ ...styles.metricValue, color: '#ef4444' }}>{resumo.canceladas}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div>
            <div style={styles.metricLabel}>Faturamento (finalizadas)</div>
            <div style={{ ...styles.metricValue, color: '#38bdf8' }}>{formatBRL(resumo.faturamento)}</div>
          </div>
        </div>
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
        <div style={styles.filtroGroup}>
          <label style={styles.label}>Técnico</label>
          <select
            style={styles.select}
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
          >
            <option value="todos">Todos</option>
            {tecnicos.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
        </div>
        <div style={styles.filtroGroup}>
          <label style={styles.label}>Status</label>
          <select
            style={styles.select}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div style={{ ...styles.filtroGroup, flex: 1, minWidth: '200px' }}>
          <label style={styles.label}>Busca</label>
          <div style={styles.inputWithIcon}>
            <input
              type="text"
              placeholder="OS, cliente ou aparelho..."
              style={styles.searchInput}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Search size={14} style={styles.innerIcon} />
          </div>
        </div>
        <button type="button" style={styles.btnDangerOutline} onClick={limparFiltros}>
          <Eraser size={14} /> Limpar
        </button>
      </div>

      {erro && <div style={styles.erro}>{erro}</div>}

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>Carregando histórico...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '60px' }}></th>
                <th style={styles.th}>Nº OS</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Aparelho</th>
                <th style={styles.th}>Serviço / Relato</th>
                <th style={styles.th}>Técnico</th>
                <th style={styles.th}>Encerramento</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={styles.empty}>
                    {ordens.length === 0
                      ? 'Nenhuma OS finalizada ou cancelada ainda.'
                      : 'Nenhuma OS corresponde aos filtros.'}
                  </td>
                </tr>
              ) : (
                ordensFiltradas.map((os) => (
                  <tr key={os.id} style={styles.tr}>
                    <td style={styles.td}>
                      <button type="button" style={styles.actionBtn} onClick={() => verOS(os)}>
                        <Eye size={14} /> Ver
                      </button>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{os.codigo}</td>
                    <td style={{ ...styles.td, color: '#93c5fd' }}>{os.cliente?.nome ?? '—'}</td>
                    <td style={styles.td}>{os.aparelho_modelo}</td>
                    <td style={styles.td}>{resumoServico(os)}</td>
                    <td style={styles.td}>{os.tecnico?.nome ?? '—'}</td>
                    <td style={styles.td}>{formatDataBR(dataReferenciaHistorico(os))}</td>
                    <td style={styles.td}>{renderStatus(os.status)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatBRL(os.valor_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233',
    padding: '20px', flex: 1, minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' },
  titulo: { color: '#fff', fontSize: '20px', margin: '0 0 6px 0', display: 'flex', alignItems: 'center' },
  subtitulo: { color: '#94a3b8', fontSize: '13px', margin: 0 },
  topActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  metricCard: {
    backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px',
    padding: '16px', display: 'flex', alignItems: 'center', gap: '12px',
  },
  metricLabel: { color: '#94a3b8', fontSize: '12px' },
  metricValue: { color: '#fff', fontSize: '22px', fontWeight: 'bold' },
  filtros: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' },
  filtroGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#94a3b8', fontSize: '12px' },
  input: {
    backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '8px 12px', color: '#fff', fontSize: '13px',
  },
  select: {
    backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '8px 12px', color: '#fff', fontSize: '13px', minWidth: '140px',
  },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchInput: {
    backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', color: '#fff',
    padding: '8px 35px 8px 12px', borderRadius: '6px', fontSize: '13px', width: '100%',
  },
  innerIcon: { position: 'absolute', right: '12px', color: '#64748b' },
  btnOutline: {
    backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  btnDangerOutline: {
    backgroundColor: 'transparent', border: '1px solid #7f1d1d', color: '#fca5a5',
    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  erro: { color: '#ef4444', fontSize: '13px' },
  tableWrapper: { overflowX: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: '#94a3b8', fontSize: '12px', padding: '12px', borderBottom: '1px solid #1f2233' },
  td: { color: '#e2e8f0', fontSize: '13px', padding: '15px 12px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c' },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925',
    border: '1px solid #2a2e3f', padding: '6px 10px', borderRadius: '4px',
    color: '#38bdf8', cursor: 'pointer', fontSize: '12px',
  },
  empty: { textAlign: 'center', padding: '30px', color: '#64748b' },
  loading: { textAlign: 'center', padding: '40px', color: '#64748b' },
};
