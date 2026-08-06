import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserCheck, RefreshCw, Plus, Eraser, ChevronDown, 
  Search, Edit, ShoppingBag, MessageCircle, Trash2,
  ChevronLeft, ChevronRight,
  X
} from 'lucide-react';
import RowActionsMenu, { RowActionsItem } from './RowActionsMenu';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import {
  CATEGORIA_LABEL,
  desativarPessoa,
  getPessoaStats,
  listPessoasResumo,
} from '../services/pessoaService';
import { listVendas, resumoProdutoVenda, STATUS_LABEL } from '../services/vendaService';
import { buildWhatsAppLink, telefoneWhatsAppCliente } from '../domain/osEvidencias';
import { formatBRL, formatCpfCnpj, onlyDigits } from '../utils/formatters';

const FILTRO_CATEGORIA = {
  Todos: null,
  Cliente: 'cliente',
  Fornecedor: 'fornecedor',
  Técnico: 'tecnico',
  Motoboy: 'motoboy',
};

const DIALOG_TYPE = {
  erro: 'error',
  sucesso: 'success',
  info: 'info',
  warning: 'warning',
};

function formatDataVenda(dataVenda, createdAt) {
  const raw = dataVenda || (createdAt ? String(createdAt).slice(0, 10) : null);
  if (!raw) return '—';
  const [y, m, d] = String(raw).slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

function badgeStatusStyle(status) {
  if (status === 'cancelada') {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      display: 'inline-block',
    };
  }
  if (status === 'pre_venda') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      color: '#fbbf24',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      display: 'inline-block',
    };
  }
  return {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#4ade80',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'inline-block',
  };
}

const ClientesList = ({ aoClicarEmCadastrar, aoMudarTela }) => {
  const { lojaAtivaId } = useLoja();
  const { alert } = useDialog();
  const [pessoas, setPessoas] = useState([]);
  const [stats, setStats] = useState({ totalPessoas: 0, totalClientes: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [menuAberto, setMenuAberto] = useState(null);
  
  const [modalHistorico, setModalHistorico] = useState({
    aberto: false,
    cliente: null,
    vendas: [],
    loading: false,
    erro: null,
  });

  const [filtros, setFiltros] = useState({
    codigo: '', nome: '', cpf: '', telefone: '', produto: '', data: ''
  });

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const carregarPessoas = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    try {
      const [listResult, statsData] = await Promise.all([
        listPessoasResumo(lojaAtivaId),
        getPessoaStats(lojaAtivaId),
      ]);

      if (listResult.error) throw listResult.error;

      setPessoas(listResult.data ?? []);
      setStats(statsData);
    } catch (err) {
      setErro(err.message ?? 'Erro ao carregar pessoas.');
      setPessoas([]);
    } finally {
      setLoading(false);
    }
  }, [lojaAtivaId]);

  useEffect(() => {
    carregarPessoas();
  }, [carregarPessoas]);

  const toggleMenu = (index, e) => {
    e.stopPropagation(); 
    setMenuAberto(menuAberto === index ? null : index);
  };

  const chamarWhatsApp = async (item) => {
    setMenuAberto(null);
    const telefone = telefoneWhatsAppCliente(item);
    if (!telefone || String(telefone).replace(/\D/g, '').length < 10) {
      await mostrarAviso('WhatsApp', 'Cadastre um telefone válido neste cliente para abrir o WhatsApp.', 'warning');
      return;
    }
    const msg = `Olá ${item.nome || ''}!`.trim();
    window.open(buildWhatsAppLink(telefone, msg), '_blank', 'noopener,noreferrer');
  };

  const mostrarAviso = async (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    await alert(mensagem, { title: titulo, type: DIALOG_TYPE[tipo] ?? tipo });
    if (acaoOk) acaoOk();
  };

  const limparFiltros = () => {
    setFiltros({ codigo: '', nome: '', cpf: '', telefone: '', produto: '', data: '' });
  };

  const fecharHistorico = () => {
    setModalHistorico({ aberto: false, cliente: null, vendas: [], loading: false, erro: null });
  };

  const abrirHistoricoCliente = async (cliente) => {
    setMenuAberto(null);
    if (!lojaAtivaId || !cliente?.id) return;

    setModalHistorico({
      aberto: true,
      cliente,
      vendas: [],
      loading: true,
      erro: null,
    });

    const { data, error } = await listVendas(lojaAtivaId, { clienteId: cliente.id });
    if (error) {
      setModalHistorico((prev) => ({
        ...prev,
        loading: false,
        erro: error.message ?? 'Não foi possível carregar o histórico.',
        vendas: [],
      }));
      return;
    }

    setModalHistorico((prev) => ({
      ...prev,
      loading: false,
      vendas: data ?? [],
      erro: null,
    }));
  };

  const editarCliente = (cliente) => {
    setMenuAberto(null);
    if (aoMudarTela) {
      aoMudarTela('novo-cliente', 'clientes', { pessoaId: cliente.id });
    }
  };

  const excluirCliente = async (cliente) => {
    setMenuAberto(null);
    if (!lojaAtivaId) return;

    const { error } = await desativarPessoa(lojaAtivaId, cliente.id);
    if (error) {
      mostrarAviso(
        'Erro',
        error.message ?? 'Não foi possível excluir o cliente.',
        'erro'
      );
      return;
    }

    mostrarAviso('Sucesso', 'Registro removido com sucesso.', 'sucesso', carregarPessoas);
  };

  const pessoasFiltradas = pessoas.filter((pessoa) => {
    const categoriaDb = FILTRO_CATEGORIA[categoriaAtiva];
    if (categoriaDb && pessoa.categoria !== categoriaDb) return false;

    const cpfFormatado = formatCpfCnpj(pessoa.cpf_cnpj);
    const matchCodigo = String(pessoa.codigo ?? '').includes(filtros.codigo);
    const matchNome = (pessoa.nome ?? '').toLowerCase().includes(filtros.nome.toLowerCase());
    const matchCpf =
      cpfFormatado.includes(filtros.cpf) ||
      onlyDigits(pessoa.cpf_cnpj).includes(onlyDigits(filtros.cpf));
    const matchTelefone = (pessoa.telefone ?? '').includes(filtros.telefone);

    return matchCodigo && matchNome && matchCpf && matchTelefone;
  });

  const qtdFiltrosAtivos = Object.values(filtros).filter(val => val !== '').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: '80vh' }}>
      
      {/* CARDS DE MÉTRICAS */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIconBox}><Users size={20} color="#38bdf8" /></div>
          <div>
            <div style={styles.metricLabel}>Total de pessoas</div>
            <div style={styles.metricValue}>{stats.totalPessoas}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIconBox}><UserCheck size={20} color="#38bdf8" /></div>
          <div>
            <div style={styles.metricLabel}>Total de clientes</div>
            <div style={styles.metricValue}>{stats.totalClientes}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIconBox}><RefreshCw size={20} color="#c084fc" /></div>
          <div>
            <div style={styles.metricLabel}>Índice de recompra (%)</div>
            <div style={styles.metricValue}>—</div>
          </div>
        </div>
      </div>

      {/* CONTAINER DA LISTAGEM */}
      <div style={styles.container}>
        <div style={styles.actionHeader}>
          <div style={styles.leftActions}>
            <button style={styles.btnPrimary} onClick={aoClicarEmCadastrar}>
              <Plus size={16} /> Cadastrar
            </button>
          </div>
          <div style={styles.rightActions}>
            <button 
              style={{...styles.btnClear, opacity: qtdFiltrosAtivos > 0 ? 1 : 0.3, pointerEvents: qtdFiltrosAtivos > 0 ? 'auto' : 'none'}} 
              onClick={limparFiltros}
            >
              <Eraser size={14} /> Limpar filtros
            </button>
          </div>
        </div>

        <div style={styles.categoriesGroup}>
          {Object.keys(FILTRO_CATEGORIA).map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.categoryBtn,
                ...(categoriaAtiva === cat ? styles.categoryBtnActive : {}),
              }}
              onClick={() => setCategoriaAtiva(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* TABELA DE PESSOAS */}
        <div style={styles.tableWrapper}>
          {erro && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{erro}</div>
          )}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cód.</th>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Vínculo</th>
                <th style={styles.th}>CPF/CNPJ</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>Último Produto Comprado</th>
                <th style={styles.th}>Data Última Compra</th>
                <th style={{...styles.th, textAlign: 'center'}}>Ações</th>
              </tr>
              {/* LINHA DE FILTROS NA TABELA */}
              <tr style={styles.filterRow}>
                <td style={styles.tdFilter}>
                  <input
                    style={styles.filterInput}
                    placeholder="Nº..."
                    value={filtros.codigo}
                    onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value.replace(/[^0-9]/g, '') })}
                  />
                </td>
                <td style={styles.tdFilter}>
                  <div style={styles.inputWithIcon}>
                    <input style={styles.filterInput} placeholder="Buscar por nome..." value={filtros.nome} onChange={(e) => setFiltros({...filtros, nome: e.target.value})} />
                    <Search size={12} color="#64748b" style={styles.innerIcon} />
                  </div>
                </td>
                <td style={styles.tdFilter}></td>
                <td style={styles.tdFilter}>
                  <input
                    style={styles.filterInput}
                    placeholder="000.000.000-00"
                    value={filtros.cpf}
                    onChange={(e) => setFiltros({ ...filtros, cpf: e.target.value.replace(/[^0-9.\-/]/g, '') })}
                  />
                </td>
                <td style={styles.tdFilter}>
                  <input
                    style={styles.filterInput}
                    placeholder="(00) 00000-0000"
                    value={filtros.telefone}
                    onChange={(e) => setFiltros({ ...filtros, telefone: e.target.value.replace(/[^0-9()\-\s]/g, '') })}
                  />
                </td>
                <td style={styles.tdFilter}>
                  <div style={styles.inputWithIcon}>
                    <input style={styles.filterInput} placeholder="Buscar produto..." value={filtros.produto} onChange={(e) => setFiltros({...filtros, produto: e.target.value})} />
                    <Search size={12} color="#64748b" style={styles.innerIcon} />
                  </div>
                </td>
                <td style={styles.tdFilter}><input style={styles.filterInput} type="date" value={filtros.data} onChange={(e) => setFiltros({...filtros, data: e.target.value})} /></td>
                <td style={styles.tdFilter}></td>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Carregando pessoas...
                  </td>
                </tr>
              ) : pessoasFiltradas.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Nenhuma pessoa encontrada.</td></tr>
              ) : (
                pessoasFiltradas.map((item, index) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={{...styles.td, color: '#e2e8f0'}}>{item.codigo}</td>
                    <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}}>{item.nome}</td>
                    <td style={styles.td}>
                      <span style={styles.badgeCategoria}>
                        {CATEGORIA_LABEL[item.categoria] ?? item.categoria}
                      </span>
                    </td>
                    <td style={styles.td}>{formatCpfCnpj(item.cpf_cnpj) || '—'}</td>
                    <td style={styles.td}>{item.telefone || '—'}</td>
                    <td style={{...styles.td, color: '#64748b'}}>—</td>
                    <td style={styles.td}>—</td>
                    
                    {/* MENU DE AÇÕES INTELIGENTE */}
                    <td style={{...styles.td, textAlign: 'center', overflow: 'visible'}}>
                      <RowActionsMenu open={menuAberto === index} onToggle={(e) => toggleMenu(index, e)}>
                        <RowActionsItem onClick={() => editarCliente(item)}>
                          <Edit size={14} color="#e2e8f0" /> Editar Cadastro
                        </RowActionsItem>
                        <RowActionsItem onClick={() => abrirHistoricoCliente(item)}>
                          <ShoppingBag size={14} color="#38bdf8" /> Histórico de Compras
                        </RowActionsItem>
                        <RowActionsItem style={{ color: '#4ade80' }} onClick={() => chamarWhatsApp(item)}>
                          <MessageCircle size={14} color="#4ade80" /> Chamar no WhatsApp
                        </RowActionsItem>
                        <RowActionsItem
                          style={{ color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px' }}
                          onClick={() => excluirCliente(item)}
                        >
                          <Trash2 size={14} color="#ef4444" /> Excluir Registro
                        </RowActionsItem>
                      </RowActionsMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CONTAGEM DE REGISTROS */}
        <div style={styles.paginationArea}>
          <div style={{color: '#64748b', fontSize: '12px'}}>
            Mostrando {pessoasFiltradas.length > 0 ? 1 : 0} a {pessoasFiltradas.length} de {pessoasFiltradas.length} registros
          </div>
          <div style={styles.paginationControls}>
            <button style={styles.btnPage} disabled><ChevronLeft size={16}/></button>
            <button style={styles.btnPageActive}>1</button>
            <button style={styles.btnPage} disabled><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* ================= MODAIS ================= */}

      {/* MODAL: HISTÓRICO DE COMPRAS DO CLIENTE */}
      {modalHistorico.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentLarge}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{margin: '0 0 5px 0', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <ShoppingBag size={20} color="#38bdf8" />
                  Histórico de Compras
                </h3>
                <span style={{color: '#94a3b8', fontSize: '13px'}}>Cliente: <strong style={{color: '#e2e8f0'}}>{modalHistorico.cliente?.nome}</strong></span>
              </div>
              <button style={styles.btnClose} onClick={fecharHistorico}><X size={20}/></button>
            </div>
            
            <div style={{padding: '20px 0', overflowY: 'auto', maxHeight: '400px'}}>
              {modalHistorico.loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
                  Carregando histórico...
                </div>
              ) : modalHistorico.erro ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#f87171', fontSize: '13px' }}>
                  {modalHistorico.erro}
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Cód. Venda</th>
                      <th style={styles.th}>Produto(s)</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Valor Total</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalHistorico.vendas.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          Nenhuma venda vinculada a este cliente.
                        </td>
                      </tr>
                    ) : (
                      modalHistorico.vendas.map((venda) => (
                        <tr key={venda.id} style={styles.tr}>
                          <td style={styles.td}>{formatDataVenda(venda.data_venda, venda.created_at)}</td>
                          <td style={{...styles.td, color: '#e2e8f0'}}>#{venda.codigo}</td>
                          <td style={{...styles.td, color: '#38bdf8'}}>{resumoProdutoVenda(venda)}</td>
                          <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>
                            {formatBRL(venda.valor_total)}
                          </td>
                          <td style={styles.td}>
                            <span style={badgeStatusStyle(venda.status)}>
                              {STATUS_LABEL[venda.status] ?? venda.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={fecharHistorico}>Fechar Histórico</button>
              <button
                style={styles.btnPrimary}
                onClick={() => {
                  const clienteId = modalHistorico.cliente?.id;
                  fecharHistorico();
                  aoMudarTela?.('nova-venda', 'clientes', clienteId ? { clienteId } : undefined);
                }}
              >
                Nova Venda para este Cliente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  metricCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' },
  metricIconBox: { backgroundColor: '#161925', padding: '12px', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  metricLabel: { color: '#94a3b8', fontSize: '13px', marginBottom: '4px' },
  metricValue: { color: '#fff', fontSize: '24px', fontWeight: 'bold' },

  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '15px' },
  rightActions: { display: 'flex', gap: '15px' },
  
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' },
  btnClear: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', transition: '0.2s' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },

  categoriesGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  categoryBtn: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
  categoryBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#38bdf8', fontWeight: '600' },
  badgeCategoria: { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },

  tableWrapper: { overflowX: 'auto', marginTop: '10px', paddingBottom: '80px', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '11px', fontWeight: '600', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#161925', transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px 4px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '6px 8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '8px', color: '#64748b' },
  
  badgeSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },

  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '210px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '35px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1f2233' },
  paginationControls: { display: 'flex', gap: '5px' },
  btnPage: { backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'not-allowed', padding: '4px 8px', display: 'flex', alignItems: 'center' },
  btnPageActive: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentLarge: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '700px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
};

export default ClientesList;