import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid, RefreshCw, ChevronRight, ExternalLink, User, Smartphone, Calendar,
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { formatBRL } from '../utils/formatters';
import {
  KANBAN_COLUMNS,
  podeAlterarStatusKanban,
  podeMoverPara,
  transicoesPermitidas,
} from '../domain/osStatus';
import {
  cancelarOrdemServico,
  finalizarOrdemServico,
  listOrdensServico,
  STATUS_COLORS,
  STATUS_LABEL,
  updateOrdemServicoStatus,
} from '../services/osService';

function formatDataCurta(iso) {
  if (!iso) return null;
  const d = String(iso).slice(0, 10);
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}

function OSCard({ os, onEditar, onMoverStatus, movendo }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const cores = STATUS_COLORS[os.status] ?? STATUS_COLORS.aberta;
  const transicoes = transicoesPermitidas(os.status);

  useEffect(() => {
    if (!menuAberto) return undefined;
    const fechar = () => setMenuAberto(false);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, [menuAberto]);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <button type="button" style={styles.codigoBtn} onClick={() => onEditar(os)}>
          {os.codigo}
        </button>
        {podeAlterarStatusKanban(os.status) && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              style={styles.moverBtn}
              disabled={movendo}
              onClick={(e) => {
                e.stopPropagation();
                setMenuAberto((v) => !v);
              }}
              title="Mover status"
            >
              <ChevronRight size={14} />
            </button>
            {menuAberto && (
              <div style={styles.menu} onClick={(e) => e.stopPropagation()}>
                {transicoes.map((status) => (
                  <button
                    key={status}
                    type="button"
                    style={styles.menuItem}
                    onClick={() => {
                      setMenuAberto(false);
                      onMoverStatus(os, status);
                    }}
                  >
                    <span style={{ color: STATUS_COLORS[status]?.color ?? '#e2e8f0' }}>
                      {STATUS_LABEL[status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button type="button" style={styles.cardBody} onClick={() => onEditar(os)}>
        <span style={styles.clienteNome}>{os.cliente?.nome ?? '—'}</span>
        <span style={styles.linha}>
          <Smartphone size={12} /> {os.aparelho_modelo ?? '—'}
        </span>
        {os.tecnico?.nome && (
          <span style={styles.linha}>
            <User size={12} /> {os.tecnico.nome}
          </span>
        )}
        {os.data_previsao && (
          <span style={styles.linha}>
            <Calendar size={12} /> Previsão {formatDataCurta(os.data_previsao)}
          </span>
        )}
        <div style={styles.cardFooter}>
          <span style={{ ...styles.badge, color: cores.color, backgroundColor: cores.bg }}>
            {STATUS_LABEL[os.status]}
          </span>
          <strong style={styles.valor}>{formatBRL(os.valor_total ?? 0)}</strong>
        </div>
      </button>
    </div>
  );
}

export default function OSPainelTecnico({ aoMudarTela }) {
  const { lojaAtivaId, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [movendoId, setMovendoId] = useState(null);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data, error } = await listOrdensServico(lojaAtivaId);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar ordens de serviço.');
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
      if (os.tecnico?.id) {
        map.set(os.tecnico.id, os.tecnico.nome);
      }
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [ordens]);

  const ordensVisiveis = useMemo(() => {
    return ordens.filter((os) => {
      if (os.status === 'cancelada') return false;
      if (filtroTecnico !== 'todos' && os.tecnico?.id !== filtroTecnico) return false;
      return true;
    });
  }, [ordens, filtroTecnico]);

  const porColuna = useMemo(() => {
    const map = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, []]));
    ordensVisiveis.forEach((os) => {
      if (map[os.status]) map[os.status].push(os);
    });
    return map;
  }, [ordensVisiveis]);

  const editarOS = (os) => {
    if (aoMudarTela) {
      aoMudarTela('nova-os', 'painel-tecnico', { osId: os.id });
    }
  };

  const moverStatus = async (os, novoStatus) => {
    if (!lojaAtivaId || !podeMoverPara(os.status, novoStatus)) return;

    if (novoStatus === 'finalizada') {
      const confirmar = await confirm(
        `Finalizar a ${os.codigo}? Peças vinculadas serão baixadas do estoque.`,
        { title: 'Finalizar OS', confirmLabel: 'Finalizar', confirmVariant: 'primary' }
      );
      if (!confirmar) return;

      setMovendoId(os.id);
      const { error } = await finalizarOrdemServico(lojaAtivaId, os.id, perfil?.id);
      setMovendoId(null);

      if (error) {
        await alert(error.message ?? 'Não foi possível finalizar.', { type: 'error', title: 'Erro' });
        return;
      }

      carregar();
      return;
    }

    if (novoStatus === 'cancelada') {
      const confirmar = await confirm(`Cancelar a ${os.codigo}?`, { title: 'Cancelar OS' });
      if (!confirmar) return;

      setMovendoId(os.id);
      const { error } = await cancelarOrdemServico(lojaAtivaId, os.id);
      setMovendoId(null);

      if (error) {
        await alert(error.message ?? 'Não foi possível cancelar.', { type: 'error', title: 'Erro' });
        return;
      }

      carregar();
      return;
    }

    setMovendoId(os.id);
    const { error } = await updateOrdemServicoStatus(lojaAtivaId, os.id, novoStatus);
    setMovendoId(null);

    if (error) {
      await alert(error.message ?? 'Não foi possível atualizar o status.', { type: 'error', title: 'Erro' });
      return;
    }

    setOrdens((prev) => prev.map((item) => (item.id === os.id ? { ...item, status: novoStatus } : item)));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.titulo}>
            <LayoutGrid size={22} color="#38bdf8" style={{ marginRight: '10px' }} />
            Painel do Técnico
          </h2>
          <p style={styles.subtitulo}>
            Acompanhe o fluxo de reparos por coluna. Use a seta no card para mover o status.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            style={styles.btnOutline}
            onClick={() => aoMudarTela?.('listagem-os', 'painel-tecnico')}
          >
            <ExternalLink size={14} /> Ver listagem
          </button>
          <button type="button" style={styles.btnOutline} onClick={carregar} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      <div style={styles.filtros}>
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

      {erro && <div style={styles.erro}>{erro}</div>}
      {loading && <div style={styles.loading}>Carregando painel...</div>}

      {!loading && !erro && (
        <div style={styles.board}>
          {KANBAN_COLUMNS.map((col) => {
            const itens = porColuna[col.id] ?? [];
            const cores = STATUS_COLORS[col.id];

            return (
              <div key={col.id} style={styles.coluna}>
                <div style={styles.colunaHeader}>
                  <span style={{ color: cores?.color ?? '#e2e8f0', fontWeight: 'bold' }}>
                    {col.label}
                  </span>
                  <span style={styles.contador}>{itens.length}</span>
                </div>
                <div style={styles.colunaBody}>
                  {itens.length === 0 && (
                    <span style={styles.vazio}>Nenhuma OS</span>
                  )}
                  {itens.map((os) => (
                    <OSCard
                      key={os.id}
                      os={os}
                      movendo={movendoId === os.id}
                      onEditar={editarOS}
                      onMoverStatus={moverStatus}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' },
  titulo: { color: '#fff', fontSize: '20px', margin: '0 0 6px 0', display: 'flex', alignItems: 'center' },
  subtitulo: { color: '#94a3b8', fontSize: '13px', margin: 0 },
  headerActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btnOutline: {
    backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  filtros: { display: 'flex', alignItems: 'center', gap: '12px' },
  label: { color: '#94a3b8', fontSize: '12px' },
  select: {
    backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '8px 12px', color: '#fff', fontSize: '13px', minWidth: '180px',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))',
    gap: '16px',
    overflowX: 'auto',
    flex: 1,
    alignItems: 'start',
    paddingBottom: '8px',
  },
  coluna: {
    backgroundColor: '#0f111a',
    border: '1px solid #1f2233',
    borderRadius: '10px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 280px)',
  },
  colunaHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid #1f2233',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contador: {
    backgroundColor: '#1f2233',
    color: '#94a3b8',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  colunaBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    flex: 1,
  },
  vazio: { color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '20px 0' },
  card: {
    backgroundColor: '#11131c',
    border: '1px solid #2a2e3f',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px 0',
  },
  codigoBtn: {
    background: 'none', border: 'none', color: '#38bdf8', fontWeight: 'bold',
    fontSize: '13px', cursor: 'pointer', padding: 0,
  },
  moverBtn: {
    backgroundColor: '#1f2233', border: '1px solid #2a2e3f', borderRadius: '4px',
    color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex',
  },
  menu: {
    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
    backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '6px',
    zIndex: 20, minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  menuItem: {
    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
  },
  cardBody: {
    display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 12px 12px',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  clienteNome: { color: '#e2e8f0', fontSize: '14px', fontWeight: '600' },
  linha: { color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' },
  badge: { fontSize: '10px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' },
  valor: { color: '#4ade80', fontSize: '13px' },
  loading: { color: '#94a3b8', textAlign: 'center', padding: '40px' },
  erro: {
    color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px',
    fontSize: '13px',
  },
};
