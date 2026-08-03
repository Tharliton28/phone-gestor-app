import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertCircle, RefreshCw, Download, ChevronDown,
  Search, FilePen, TrendingDown, PackagePlus,
  Package, ShoppingCart, Shield
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { TIPO_LABEL } from '../services/produtoService';
import { createMovimentacaoManual } from '../services/movimentacaoService';
import { listRupturasEstoque } from '../services/rupturaService';
import { getLojaConfig, permiteVendaSemEstoque } from '../services/lojaConfigService';
import { formatBRL } from '../utils/formatters';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RupturaEstoque = ({ aoMudarTela }) => {
  const { lojaAtivaId, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const [rupturas, setRupturas] = useState([]);
  const [permiteRuptura, setPermiteRuptura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroNome, setFiltroNome] = useState('');

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const [rupturasResult, configResult] = await Promise.all([
      listRupturasEstoque(lojaAtivaId),
      getLojaConfig(lojaAtivaId),
    ]);

    if (rupturasResult.error) {
      setErro(rupturasResult.error.message ?? 'Erro ao carregar rupturas.');
      setRupturas([]);
    } else {
      setRupturas(rupturasResult.data ?? []);
    }

    if (!configResult.error && configResult.data) {
      setPermiteRuptura(permiteVendaSemEstoque(configResult.data));
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === id ? null : id);
  };

  const handleAjustarSaldo = async (item) => {
    if (!lojaAtivaId) return;

    const qtdEntrada = Math.abs(item.saldo_atual);
    const confirmar = await confirm(
      `Dar entrada de ${qtdEntrada} unidade(s) de "${item.produto}" para corrigir o saldo negativo?`,
      { title: 'Ajustar saldo', confirmLabel: 'Confirmar entrada', confirmVariant: 'primary' }
    );
    if (!confirmar) return;

    const { error } = await createMovimentacaoManual(lojaAtivaId, {
      produtoId: item.id,
      tipo: 'entrada',
      quantidade: qtdEntrada,
      motivo: 'Correção de ruptura de estoque',
      operadorId: perfil?.id,
    });

    if (error) {
      await alert(error.message ?? 'Não foi possível ajustar o saldo.', { type: 'error', title: 'Erro' });
      return;
    }

    await alert('Saldo ajustado com sucesso!', { type: 'success', title: 'Sucesso' });
    carregar();
  };

  const handleVerProduto = (item) => {
    if (aoMudarTela) {
      aoMudarTela('novo-produto', 'ruptura-estoque', { produtoId: item.id });
    }
  };

  const handleGerarCompra = () => {
    if (aoMudarTela) {
      aoMudarTela('nova-ordem-compra', 'ruptura-estoque');
    } else {
      alert('Acesse Compras > Ordem de Compra para registrar uma nova compra.', { type: 'info', title: 'Ordem de compra' });
    }
  };

  const rupturasFiltradas = useMemo(() => {
    return rupturas.filter((item) => {
      if (filtroCodigo && !String(item.codigo).includes(filtroCodigo.trim())) {
        return false;
      }
      if (filtroNome && !item.produto?.toLowerCase().includes(filtroNome.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rupturas, filtroCodigo, filtroNome]);

  const impacto = useMemo(() => {
    const total = rupturasFiltradas.length;
    const valorTotal = rupturasFiltradas.reduce(
      (acc, item) => acc + Math.abs(item.saldo_atual) * Number(item.valor_venda ?? 0),
      0
    );
    let nivel = 'Baixo';
    if (total >= 5 || valorTotal >= 5000) nivel = 'Alto';
    else if (total >= 2 || valorTotal >= 1000) nivel = 'Médio';

    return { total, valorTotal, nivel };
  }, [rupturasFiltradas]);

  const regraVendaLabel =
    permiteRuptura === null
      ? 'Carregando regra...'
      : permiteRuptura
        ? 'PDV: permite venda com saldo negativo'
        : 'PDV: bloqueia venda sem estoque';

  return (
    <div style={styles.container}>
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnRefresh} onClick={carregar} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Atualizando...' : 'Atualizar Lista'}
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline} type="button">
            <Download size={14} /> Exportar Relatório <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {erro && <div style={styles.erro}>{erro}</div>}

      <div style={styles.policyBanner}>
        <Shield size={16} color="#38bdf8" />
        <span>
          <strong style={{ color: '#e2e8f0' }}>Regra da loja:</strong> {regraVendaLabel}.
          {permiteRuptura !== null && (
            <>
              {' '}
              <button
                type="button"
                style={styles.linkBtn}
                onClick={() => aoMudarTela?.('config')}
              >
                Alterar em Configurações
              </button>
            </>
          )}
        </span>
      </div>

      <div style={styles.alertBanner}>
        <div style={styles.alertIcon}>
          <AlertCircle size={24} color="#fff" />
        </div>
        <div style={styles.alertContent}>
          <h4 style={styles.alertTitle}>Saldo negativo detectado</h4>
          <p style={styles.alertText}>
            Produtos com quantidade abaixo de zero indicam ruptura de estoque — entrada não registrada,
            inventário desatualizado ou venda além do saldo disponível.
          </p>
        </div>
        <div style={styles.impactBadge}>
          <TrendingDown size={16} />
          <span>Impacto: {impacto.nivel}</span>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando rupturas...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '60px' }}></th>
                <th style={styles.th}>Cód.</th>
                <th style={styles.th}>Produto</th>
                <th style={styles.th}>Categoria</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Saldo Negativo</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Valor Unit. (R$)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Impacto Estimado (R$)</th>
                <th style={styles.th}>Atualizado em</th>
              </tr>
              <tr style={styles.filterRow}>
                <td style={styles.tdFilter}></td>
                <td style={styles.tdFilter}>
                  <input
                    type="text"
                    style={styles.filterInput}
                    placeholder="Cód..."
                    value={filtroCodigo}
                    onChange={(e) => setFiltroCodigo(e.target.value)}
                  />
                </td>
                <td colSpan="6" style={styles.tdFilter}>
                  <div style={styles.inputWithIcon}>
                    <input
                      type="text"
                      placeholder="Filtrar por nome do produto..."
                      style={styles.filterInput}
                      value={filtroNome}
                      onChange={(e) => setFiltroNome(e.target.value)}
                    />
                    <Search size={14} style={styles.innerIcon} />
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              {rupturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    {rupturas.length === 0
                      ? 'Nenhum produto com saldo negativo.'
                      : 'Nenhum item corresponde aos filtros.'}
                  </td>
                </tr>
              ) : (
                rupturasFiltradas.map((item) => {
                  const impactoItem = Math.abs(item.saldo_atual) * Number(item.valor_venda ?? 0);

                  return (
                    <tr key={item.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(item.id, e)}>
                            <FilePen size={14} /> <ChevronDown size={12} />
                          </button>

                          {menuAberto === item.id && (
                            <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                              <div
                                style={styles.dropdownItem}
                                onClick={() => { setMenuAberto(null); handleAjustarSaldo(item); }}
                              >
                                <PackagePlus size={14} color="#4ade80" /> Ajustar Saldo (Entrada)
                              </div>
                              <div
                                style={styles.dropdownItem}
                                onClick={() => { setMenuAberto(null); handleVerProduto(item); }}
                              >
                                <Package size={14} color="#38bdf8" /> Acessar Ficha do Produto
                              </div>
                              <div
                                style={{
                                  ...styles.dropdownItem,
                                  borderTop: '1px solid #1f2233',
                                  marginTop: '4px',
                                  paddingTop: '8px',
                                }}
                                onClick={() => { setMenuAberto(null); handleGerarCompra(); }}
                              >
                                <ShoppingCart size={14} color="#fbbf24" /> Gerar Ordem de Compra
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, color: '#64748b' }}>{item.codigo}</td>
                      <td style={{ ...styles.td, fontWeight: '500', color: '#e2e8f0' }}>{item.produto}</td>
                      <td style={styles.td}>{TIPO_LABEL[item.tipo] ?? item.categoria}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.negativeBadge}>{item.saldo_atual}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>{formatBRL(item.valor_venda)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                        {formatBRL(impactoItem)}
                      </td>
                      <td style={styles.td}>{formatDateTime(item.atualizado_em)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex' },
  rightActions: { display: 'flex' },
  erro: { color: '#ef4444', fontSize: '13px', marginTop: '12px' },
  policyBanner: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' },
  linkBtn: { background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' },
  btnRefresh: { backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  alertBanner: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginTop: '12px' },
  alertIcon: { width: '45px', height: '45px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertContent: { flex: 1 },
  alertTitle: { color: '#ef4444', fontSize: '15px', fontWeight: 'bold', margin: 0, marginBottom: '4px' },
  alertText: { color: '#94a3b8', fontSize: '13px', margin: 0 },
  impactBadge: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '20px', color: '#fbbf24', fontSize: '12px', fontWeight: '600', flexShrink: 0 },
  tableWrapper: { overflow: 'visible', marginTop: '20px', paddingBottom: '150px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  negativeBadge: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' },
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },
};

export default RupturaEstoque;
