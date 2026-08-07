import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Building, ShoppingCart, Package, DollarSign, FileText, 
  BarChart2, Save, UploadCloud, ToggleRight, ToggleLeft,
  Plus, X, Edit, Trash2, CreditCard, Printer, Eye, EyeOff, RotateCcw, Coins, Zap, Users
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { useErpNavigation } from '../hooks/useErpNavigation';
import LojaCreditosPanel from './LojaCreditosPanel';
import LojaEquipePanel from './LojaEquipePanel';
import LojaPlanoPanel from './LojaPlanoPanel';
import { uploadLogoLoja } from '../services/lojaLogoService';
import {
  mapLojaToEmpresaForm,
  REGIMES_TRIBUTARIOS,
  updateLojaEmpresa,
} from '../services/lojaService';
import { formatCnpj, onlyDigits } from '../utils/formatters';
import {
  getLojaConfig,
  mapConfigToToggles,
  updateLojaConfigToggles,
  getLojaConfigAssistencia,
  updateLojaConfigDocumentos,
  getLojaConfigFiscal,
  mapConfigToFiscal,
  updateLojaConfigFiscal,
  getFocusTokenConfigurado,
  salvarFocusNfeToken,
  removerFocusNfeToken,
} from '../services/lojaConfigService';
import { TERMO_OS_PADRAO, TERMO_OS_SAIDA_PADRAO } from '../services/osEvidenciaService';
import {
  TERMO_GARANTIA_PADRAO,
  diagnosticoTermosConsulta,
} from '../domain/documentoTermos';
import {
  cloneDefaultTaxas,
  listTaxasCreditoParcela,
  saveTaxasCreditoParcela,
} from '../services/taxaCreditoService';
import {
  createFormaPagamento,
  desativarFormaPagamento,
  listFormasPagamentoAdmin,
  mapFormaPagamentoToUI,
  reativarFormaPagamento,
  TIPOS_FORMA_UI,
  updateFormaPagamento,
} from '../services/formaPagamentoService';

// --- COMPONENTE PRINCIPAL DE CONFIGURAÇÕES ---
const Configuracoes = () => {
  const { alert, confirm } = useDialog();
  const { lojaAtivaId, lojaAtiva, recarregar, temPermissao } = useLoja();
  const { dadosNavegacao } = useErpNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const CONFIG_ABA_KEY = 'phonegestor_config_aba';
  const abaInicial = () => {
    try {
      return (
        dadosNavegacao?.aba ||
        sessionStorage.getItem(CONFIG_ABA_KEY) ||
        'empresa'
      );
    } catch {
      return dadosNavegacao?.aba ?? 'empresa';
    }
  };
  const [abaAtiva, setAbaAtivaState] = useState(abaInicial);

  const setAbaAtiva = (aba) => {
    setAbaAtivaState(aba);
    try {
      sessionStorage.setItem(CONFIG_ABA_KEY, aba);
    } catch {
      /* ignore */
    }
    // Persiste aba no location.state sem poluir o histórico
    navigate(location.pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        dadosNavegacao: {
          ...(location.state?.dadosNavegacao || {}),
          aba,
        },
      },
    });
  };
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [carregandoConfig, setCarregandoConfig] = useState(true);
  const podeEditarEmpresa = temPermissao('owner', 'admin');
  const podeEditarLogo = podeEditarEmpresa;
  const [empresaForm, setEmpresaForm] = useState(() => mapLojaToEmpresaForm(null));
  
  const [toggles, setToggles] = useState({
    vendaSemEstoque: false,
    alertaEstoque: true,
    jurosAuto: true,
    resumoEmail: true,
    orcamentoValidadeDias: 15,
  });

  const [formasPagamento, setFormasPagamento] = useState([]);
  const [carregandoFormas, setCarregandoFormas] = useState(false);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [formDataPagamento, setFormDataPagamento] = useState({
    id: null, nome: '', tipo: 'Crédito', taxa: '', prazo: 'Imediato', ativo: true, isSistema: false,
  });

  const [taxasCredito, setTaxasCredito] = useState(cloneDefaultTaxas());
  const [maquininhaTaxasId, setMaquininhaTaxasId] = useState('');
  const [salvandoTaxas, setSalvandoTaxas] = useState(false);

  const formasCredito = useMemo(
    () => formasPagamento.filter((f) => f.tipoDb === 'credito' && f.ativo !== false),
    [formasPagamento]
  );

  // === ESTADOS DOS DOCUMENTOS ===
  const [termoGarantia, setTermoGarantia] = useState(TERMO_GARANTIA_PADRAO);
  const [termoOS, setTermoOS] = useState(TERMO_OS_PADRAO);
  const [termoOSSaida, setTermoOSSaida] = useState(TERMO_OS_SAIDA_PADRAO);
  const [exigirTermoEntrada, setExigirTermoEntrada] = useState(true);
  const [exigirFotoEntrada, setExigirFotoEntrada] = useState(true);
  const [exigirTermoSaida, setExigirTermoSaida] = useState(true);
  const [exigirFotoSaida, setExigirFotoSaida] = useState(true);
  const [bloquearKanbanSemEntrada, setBloquearKanbanSemEntrada] = useState(true);

  const [previewGarantia, setPreviewGarantia] = useState(false);
  const [previewOS, setPreviewOS] = useState(false);
  const [previewOSSaida, setPreviewOSSaida] = useState(false);

  const [fiscal, setFiscal] = useState({
    nfeAmbiente: 'homologacao',
    nfeSerie: 1,
    nfeUltimoNumero: 0,
    nfceSerie: 1,
    nfceUltimoNumero: 0,
    fiscalProvider: 'focus',
    emitirNfceAuto: false,
    certificadoPath: null,
  });
  const [focusTokenConfigurado, setFocusTokenConfigurado] = useState(false);
  const [focusTokenInput, setFocusTokenInput] = useState('');
  const [salvandoToken, setSalvandoToken] = useState(false);

  useEffect(() => {
    if (!dadosNavegacao?.aba) return;
    setAbaAtivaState(dadosNavegacao.aba);
    try {
      sessionStorage.setItem(CONFIG_ABA_KEY, dadosNavegacao.aba);
    } catch {
      /* ignore */
    }
  }, [dadosNavegacao?.aba]);

  useEffect(() => {
    setEmpresaForm(mapLojaToEmpresaForm(lojaAtiva));
  }, [lojaAtiva]);

  const setEmpresaCampo = (campo, valor) => {
    setEmpresaForm((prev) => ({ ...prev, [campo]: valor }));
  };

  useEffect(() => {
    if (!lojaAtivaId) {
      setCarregandoConfig(false);
      return;
    }

    const carregarFormas = async () => {
      setCarregandoFormas(true);
      const { data, error } = await listFormasPagamentoAdmin(lojaAtivaId);

      if (!error) {
        setFormasPagamento((data ?? []).map(mapFormaPagamentoToUI));
      }

      setCarregandoFormas(false);
    };

    const carregar = async () => {
      setCarregandoConfig(true);
      const [configResult, docResult, fiscalResult] = await Promise.all([
        getLojaConfig(lojaAtivaId),
        getLojaConfigAssistencia(lojaAtivaId),
        getLojaConfigFiscal(lojaAtivaId),
        carregarFormas(),
      ]);

      if (!configResult.error && configResult.data) {
        setToggles(mapConfigToToggles(configResult.data));
      }

      if (!docResult.error && docResult.data) {
        if (docResult.data.termo_garantia) setTermoGarantia(docResult.data.termo_garantia);
        if (docResult.data.termo_os) setTermoOS(docResult.data.termo_os);
        if (docResult.data.termo_os_saida) setTermoOSSaida(docResult.data.termo_os_saida);
        setExigirTermoEntrada(docResult.data.os_exigir_termo_entrada !== false);
        setExigirFotoEntrada(docResult.data.os_exigir_foto_entrada !== false);
        setExigirTermoSaida(docResult.data.os_exigir_termo_saida !== false);
        setExigirFotoSaida(docResult.data.os_exigir_foto_saida !== false);
        setBloquearKanbanSemEntrada(docResult.data.os_bloquear_kanban_sem_entrada !== false);
      }

      if (!fiscalResult.error && fiscalResult.data) {
        setFiscal(mapConfigToFiscal(fiscalResult.data));
      }

      const tokenStatus = await getFocusTokenConfigurado(lojaAtivaId);
      if (!tokenStatus.error) setFocusTokenConfigurado(tokenStatus.configurado);

      setCarregandoConfig(false);
    };

    carregar();
  }, [lojaAtivaId]);

  const carregarTaxasCredito = useCallback(async (formaId = null) => {
    if (!lojaAtivaId) return;

    const { data, error } = await listTaxasCreditoParcela(lojaAtivaId, formaId);

    if (!error && data) {
      setTaxasCredito(data);
    }
  }, [lojaAtivaId]);

  useEffect(() => {
    carregarTaxasCredito(maquininhaTaxasId || null);
  }, [carregarTaxasCredito, maquininhaTaxasId]);

  const salvarAlteracoes = async () => {
    if (!lojaAtivaId) {
      await alert('Nenhuma loja ativa selecionada.', { type: 'error', title: 'Erro' });
      return;
    }

    if (!podeEditarEmpresa) {
      await alert('Somente owner/admin podem alterar dados da empresa e configurações sensíveis.', {
        type: 'warning',
        title: 'Permissão',
      });
      return;
    }

    const diag = diagnosticoTermosConsulta({ termoOS, termoOSSaida, termoGarantia });
    if (!diag.osEntradaOk || !diag.osSaidaOk || !diag.garantiaOk) {
      const faltando = [
        !diag.osEntradaOk ? 'termo de entrada da OS' : null,
        !diag.osSaidaOk ? 'termo de saída da OS' : null,
        !diag.garantiaOk ? 'termo de garantia' : null,
      ].filter(Boolean);
      const seguir = await confirm(
        `Atenção LGPD: ${faltando.join(', ')} sem cláusula clara de consultas (CPF/IMEI/Anatel).\n\n` +
          'Recomendamos restaurar o padrão ou incluir a cláusula antes de salvar. Deseja salvar mesmo assim?',
        { title: 'Cláusula de consultas', confirmLabel: 'Salvar assim', cancelLabel: 'Revisar' }
      );
      if (!seguir) return;
    }

    setSalvando(true);
    const [empresaResult, toggleResult, docResult, fiscalResult] = await Promise.all([
      updateLojaEmpresa(lojaAtivaId, empresaForm),
      updateLojaConfigToggles(lojaAtivaId, toggles),
      updateLojaConfigDocumentos(lojaAtivaId, {
        termoGarantia,
        termoOS,
        termoOSSaida,
        exigirTermoEntrada,
        exigirFotoEntrada,
        exigirTermoSaida,
        exigirFotoSaida,
        bloquearKanbanSemEntrada,
      }),
      updateLojaConfigFiscal(lojaAtivaId, fiscal),
    ]);
    setSalvando(false);

    if (empresaResult.error || toggleResult.error || docResult.error || fiscalResult.error) {
      await alert(
        empresaResult.error?.message
          ?? toggleResult.error?.message
          ?? docResult.error?.message
          ?? fiscalResult.error?.message
          ?? 'Não foi possível salvar as configurações.',
        { type: 'error', title: 'Erro' }
      );
      return;
    }

    if (fiscalResult.data) {
      setFiscal(mapConfigToFiscal(fiscalResult.data));
    }

    await recarregar?.();
    await alert('Configurações salvas com sucesso!', { type: 'success', title: 'Sucesso' });
  };

  const abrirModalPagamento = (forma = null) => {
    if (forma) {
      setFormDataPagamento(forma);
    } else {
      setFormDataPagamento({
        id: null, nome: '', tipo: 'Crédito', taxa: '', prazo: 'Imediato', ativo: true, isSistema: false,
      });
    }
    setModalPagamentoAberto(true);
  };

  const recarregarFormas = async () => {
    if (!lojaAtivaId) return;

    setCarregandoFormas(true);
    const { data, error } = await listFormasPagamentoAdmin(lojaAtivaId);

    if (!error) {
      setFormasPagamento((data ?? []).map(mapFormaPagamentoToUI));
    }

    setCarregandoFormas(false);
  };

  const salvarPagamento = async () => {
    if (!lojaAtivaId) {
      await alert('Nenhuma loja ativa selecionada.', { type: 'error', title: 'Erro' });
      return;
    }

    if (!formDataPagamento.nome?.trim()) {
      await alert('Informe o nome da forma de pagamento.', { type: 'warning', title: 'Campos obrigatórios' });
      return;
    }

    if (!formDataPagamento.isSistema && (formDataPagamento.taxa === '' || formDataPagamento.taxa == null)) {
      await alert('Informe a taxa da operadora.', { type: 'warning', title: 'Campos obrigatórios' });
      return;
    }

    setSalvandoPagamento(true);

    const { data, error } = formDataPagamento.id
      ? await updateFormaPagamento(lojaAtivaId, formDataPagamento.id, formDataPagamento)
      : await createFormaPagamento(lojaAtivaId, formDataPagamento);

    setSalvandoPagamento(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível salvar a forma de pagamento.', { type: 'error', title: 'Erro' });
      return;
    }

    if (data) {
      const mapped = mapFormaPagamentoToUI(data);
      setFormasPagamento((prev) => {
        const idx = prev.findIndex((f) => f.id === mapped.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = mapped;
          return next;
        }
        return [...prev, mapped];
      });
    } else {
      await recarregarFormas();
    }

    setModalPagamentoAberto(false);
    await alert('Forma de pagamento salva com sucesso!', { type: 'success', title: 'Sucesso' });
  };

  const removerPagamento = async (forma) => {
    if (forma.isSistema) {
      await alert('Esta forma é do sistema e não pode ser removida.', { type: 'warning', title: 'Ação não permitida' });
      return;
    }

    const confirmar = await confirm(
      forma.ativo
        ? 'Desativar esta forma de pagamento? Ela deixará de aparecer no PDV.'
        : 'Esta forma já está inativa.',
      { title: 'Desativar forma de pagamento' }
    );

    if (!confirmar || !forma.ativo) return;

    const { error } = await desativarFormaPagamento(lojaAtivaId, forma.id);

    if (error) {
      await alert(error.message ?? 'Não foi possível desativar.', { type: 'error', title: 'Erro' });
      return;
    }

    setFormasPagamento((prev) =>
      prev.map((f) => (f.id === forma.id ? { ...f, ativo: false } : f))
    );
  };

  const reativarPagamento = async (forma) => {
    const { error } = await reativarFormaPagamento(lojaAtivaId, forma.id);

    if (error) {
      await alert(error.message ?? 'Não foi possível reativar.', { type: 'error', title: 'Erro' });
      return;
    }

    setFormasPagamento((prev) =>
      prev.map((f) => (f.id === forma.id ? { ...f, ativo: true } : f))
    );
  };

  const atualizarTaxaParcela = (parcelas, valor) => {
    const taxa = Number(String(valor).replace(',', '.'));
    setTaxasCredito((prev) => ({
      ...prev,
      [parcelas]: Number.isFinite(taxa) ? Math.max(0, taxa) : 0,
    }));
  };

  const restaurarTaxasPadrao = async () => {
    const confirmar = await confirm(
      'Restaurar as taxas padrão de crédito (1x a 12x)? As alterações não salvas serão perdidas.',
      { title: 'Restaurar padrão' }
    );
    if (confirmar) {
      setTaxasCredito(cloneDefaultTaxas());
    }
  };

  const salvarTaxasCredito = async () => {
    if (!lojaAtivaId) {
      await alert('Nenhuma loja ativa selecionada.', { type: 'error', title: 'Erro' });
      return;
    }

    setSalvandoTaxas(true);
    const { error } = await saveTaxasCreditoParcela(
      lojaAtivaId,
      taxasCredito,
      maquininhaTaxasId || null
    );
    setSalvandoTaxas(false);

    if (error) {
      await alert(
        error.message ?? 'Não foi possível salvar as taxas. Verifique se as migrations 010/012 foram aplicadas no Supabase.',
        { type: 'error', title: 'Erro' }
      );
      return;
    }

    const alvo = maquininhaTaxasId
      ? formasCredito.find((f) => f.id === maquininhaTaxasId)?.nome ?? 'maquininha'
      : 'padrão da loja';

    await alert(`Taxas de crédito (${alvo}) salvas! Orçamentos usarão estes valores na simulação.`, {
      type: 'success',
      title: 'Sucesso',
    });
  };

  const handleToggle = (chave) => setToggles(prev => ({ ...prev, [chave]: !prev[chave] }));

  // Função para transformar as tags em dados reais no preview
  const gerarPreview = (texto) => {
    if (!texto) return '';
    const nomeEmpresa = empresaForm.razaoSocial || lojaAtiva?.razao_social || 'Sua Empresa';
    const cnpjEmpresa = formatCnpj(onlyDigits(empresaForm.cnpj || lojaAtiva?.cnpj)) || '—';
    return texto
      .replace(/\[NOME_EMPRESA\]/g, nomeEmpresa)
      .replace(/\[CNPJ_EMPRESA\]/g, cnpjEmpresa)
      .replace(/\[NOME_CLIENTE\]/g, 'Cliente Exemplo')
      .replace(/\[CPF_CLIENTE\]/g, '000.000.000-00')
      .replace(/\[DATA_VENDA\]/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\[NOME_VENDEDOR\]/g, 'Vendedor')
      .replace(/\[PRAZO_GARANTIA\]/g, '90 dias')
      .replace(/\[NUMERO_RECIBO\]/g, 'MP000000');
  };

  const Switch = ({ ativo, onClick }) => (
    <div onClick={onClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
      {ativo ? <ToggleRight size={32} color="#4ade80" /> : <ToggleLeft size={32} color="#64748b" />}
    </div>
  );

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Configurações do Sistema</h2>
          <p style={styles.subtitle}>Gerencie os dados da sua empresa e as regras de negócio dos módulos.</p>
        </div>
        <button style={styles.btnSave} onClick={salvarAlteracoes} disabled={salvando || carregandoConfig}>
          <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div style={styles.mainArea}>
        
        <div style={styles.settingsMenu}>
          <button style={abaAtiva === 'empresa' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('empresa')}>
            <Building size={16} /> Dados da Empresa
          </button>
          <button style={abaAtiva === 'vendas' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('vendas')}>
            <ShoppingCart size={16} /> Vendas e PDV
          </button>
          <button style={abaAtiva === 'estoque' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('estoque')}>
            <Package size={16} /> Compras / Estoque
          </button>
          <button style={abaAtiva === 'financeiro' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('financeiro')}>
            <DollarSign size={16} /> Financeiro e Taxas
          </button>
          <button style={abaAtiva === 'plano' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('plano')}>
            <Zap size={16} /> Plano
          </button>
          <button style={abaAtiva === 'equipe' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('equipe')}>
            <Users size={16} /> Equipe
          </button>
          <button style={abaAtiva === 'creditos' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('creditos')}>
            <Coins size={16} /> Créditos da loja
          </button>
          <button style={abaAtiva === 'documentos' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('documentos')}>
            <Printer size={16} /> Documentos e Impressão
          </button>
          <button style={abaAtiva === 'fiscal' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('fiscal')}>
            <FileText size={16} /> Fiscal e Tributário
          </button>
          <button style={abaAtiva === 'relatorios' ? styles.menuItemActive : styles.menuItem} onClick={() => setAbaAtiva('relatorios')}>
            <BarChart2 size={16} /> Relatórios e Alertas
          </button>
        </div>

        <div style={styles.contentArea}>
          
          {/* --- DADOS DA EMPRESA --- */}
          {abaAtiva === 'empresa' && (
            <div style={styles.formSection}>
              {!podeEditarEmpresa && (
                <p style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '12px' }}>
                  Visualização: somente owner/admin podem salvar alterações da empresa.
                </p>
              )}
              <h3 style={styles.sectionTitle}>Informações Básicas</h3>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Razão Social:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.razaoSocial}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('razaoSocial', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nome Fantasia:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.nomeFantasia}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('nomeFantasia', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Regime Tributário:</label>
                  <select
                    style={styles.input}
                    value={empresaForm.regimeTributario}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('regimeTributario', e.target.value)}
                  >
                    {REGIMES_TRIBUTARIOS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> CNPJ:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.cnpj}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('cnpj', formatCnpj(onlyDigits(e.target.value).slice(0, 14)))}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Inscrição Estadual (IE):</label>
                  <input
                    style={styles.input}
                    value={empresaForm.inscricaoEstadual}
                    disabled={!podeEditarEmpresa}
                    placeholder="Isento ou número da IE"
                    onChange={(e) => setEmpresaCampo('inscricaoEstadual', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Inscrição Municipal:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.inscricaoMunicipal}
                    disabled={!podeEditarEmpresa}
                    placeholder="Número da IM"
                    onChange={(e) => setEmpresaCampo('inscricaoMunicipal', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>E-mail de Contato:</label>
                  <input
                    style={styles.input}
                    type="email"
                    value={empresaForm.email}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('email', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Telefone / WhatsApp:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.telefone}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('telefone', e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Endereço</h3>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>CEP:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.cep}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => {
                      const d = onlyDigits(e.target.value).slice(0, 8);
                      setEmpresaCampo('cep', d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
                    }}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rua / Logradouro:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.logradouro}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('logradouro', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Número:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.numero}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('numero', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Complemento:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.complemento}
                    disabled={!podeEditarEmpresa}
                    placeholder="Sala, Loja, Apartamento..."
                    onChange={(e) => setEmpresaCampo('complemento', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Bairro:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.bairro}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('bairro', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Cidade:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.cidade}
                    disabled={!podeEditarEmpresa}
                    onChange={(e) => setEmpresaCampo('cidade', e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>UF:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.estado}
                    disabled={!podeEditarEmpresa}
                    maxLength={2}
                    placeholder="CE"
                    onChange={(e) => setEmpresaCampo('estado', e.target.value.toUpperCase().slice(0, 2))}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Código IBGE:</label>
                  <input
                    style={styles.input}
                    value={empresaForm.codigoIbge}
                    disabled={!podeEditarEmpresa}
                    placeholder="Ex: 2307650"
                    onChange={(e) => setEmpresaCampo('codigoIbge', onlyDigits(e.target.value).slice(0, 7))}
                  />
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Imagem</h3>
              <div style={{...styles.logoUploadArea, marginTop: '20px'}}>
                {lojaAtiva?.logo_url ? (
                  <img src={lojaAtiva.logo_url} alt="Logo da loja" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '1px solid #2a2e3f' }} />
                ) : (
                  <div style={styles.logoPlaceholder}>LOGO</div>
                )}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', flex: 1}}>
                  <span style={{color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold'}}>Logotipo da Empresa</span>
                  <span style={{color: '#94a3b8', fontSize: '12px'}}>
                    Aparece no menu do usuário e em documentos. Ideal: PNG/JPG/WEBP quadrado, até 2MB.
                    Somente owner/admin podem alterar.
                  </span>
                  <label style={{...styles.btnUpload, opacity: !podeEditarLogo || enviandoLogo ? 0.6 : 1, cursor: !podeEditarLogo || enviandoLogo ? 'not-allowed' : 'pointer'}}>
                    <UploadCloud size={14} /> {enviandoLogo ? 'Enviando…' : 'Enviar logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      disabled={!podeEditarLogo || enviandoLogo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file || !lojaAtivaId) return;
                        setEnviandoLogo(true);
                        const { error } = await uploadLogoLoja(lojaAtivaId, file);
                        setEnviandoLogo(false);
                        if (error) {
                          await alert(error.message, { type: 'error', title: 'Logo' });
                          return;
                        }
                        await recarregar?.();
                        await alert('Logo atualizada.', { type: 'success', title: 'Logo' });
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* --- VENDAS E PDV --- */}
          {abaAtiva === 'vendas' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Regras de Vendas</h3>
              
              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Permitir venda com saldo insuficiente (ruptura)</h4>
                  <p style={styles.toggleDesc}>
                    Desativado: o PDV bloqueará vendas quando o saldo for zero ou negativo.
                    Ativado: permite concluir a venda e o produto aparecerá em Ruptura de Estoque.
                  </p>
                </div>
                <Switch ativo={toggles.vendaSemEstoque} onClick={() => handleToggle('vendaSemEstoque')} />
              </div>

              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Validade padrão de orçamentos (dias)</h4>
                  <p style={styles.toggleDesc}>
                    Dias corridos aplicados automaticamente ao criar um novo orçamento. Entre 1 e 365.
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={365}
                  style={styles.inputNumber}
                  value={toggles.orcamentoValidadeDias}
                  onChange={(e) => {
                    const valor = Math.min(365, Math.max(1, Number(e.target.value) || 15));
                    setToggles((prev) => ({ ...prev, orcamentoValidadeDias: valor }));
                  }}
                />
              </div>

              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, marginTop: '24px' }}>
                Catálogos (marcas, cores, tipos) vêm do cadastro de produto por enquanto. Editor de listas persistente entra em breve.
              </p>
            </div>
          )}

          {/* --- ESTOQUE E PRODUTOS --- */}
          {abaAtiva === 'estoque' && (
            <div style={{...styles.formSection, maxWidth: '100%'}}>
              <h3 style={styles.sectionTitle}>Atributos de Produtos e Estoque</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Catálogos (marcas, cores, tipos) vêm do cadastro de produto por enquanto. Editor de listas persistente entra em breve.
              </p>
            </div>
          )}

          {/* --- FINANCEIRO E TAXAS --- */}
          {abaAtiva === 'financeiro' && (
            <div style={{...styles.formSection, maxWidth: '100%'}}>
              
              <h3 style={styles.sectionTitle}>Formas de Pagamento, Maquininhas e Taxas</h3>
              <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '20px'}}>
                Cadastre suas maquininhas e as taxas cobradas. O sistema usará esses dados para calcular o lucro líquido real de cada venda e aplicar acréscimos automaticamente no PDV.
              </p>

              <div style={styles.tableWrapper}>
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
                  <button style={styles.btnAction} onClick={() => abrirModalPagamento(null)}>
                    <Plus size={14} /> Adicionar Forma de Pagamento
                  </button>
                </div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nome / Identificação</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Taxa (%)</th>
                      <th style={styles.th}>Prazo Recebimento</th>
                      <th style={styles.th}>Status</th>
                      <th style={{...styles.th, textAlign: 'center'}}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregandoFormas && (
                      <tr>
                        <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>
                          Carregando formas de pagamento...
                        </td>
                      </tr>
                    )}
                    {!carregandoFormas && formasPagamento.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>
                          Nenhuma forma cadastrada. Adicione maquininhas e taxas abaixo.
                        </td>
                      </tr>
                    )}
                    {!carregandoFormas && formasPagamento.map((forma) => (
                      <tr key={forma.id} style={{ ...styles.tr, opacity: forma.ativo ? 1 : 0.55 }}>
                        <td style={{...styles.td, color: '#e2e8f0', fontWeight: 'bold'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <CreditCard size={14} color="#64748b" /> {forma.nome}
                            {forma.isSistema && (
                              <span style={styles.badgeSistema}>Sistema</span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>{forma.tipo}</td>
                        <td style={{...styles.td, color: forma.taxa === '0' || forma.taxa === '0.00' ? '#4ade80' : '#fbbf24', fontWeight: 'bold'}}>
                          {forma.taxa}%
                        </td>
                        <td style={styles.td}>{forma.prazo || '—'}</td>
                        <td style={styles.td}>
                          {forma.ativo ? (
                            <span style={styles.badgeSuccess}>Ativo</span>
                          ) : (
                            <span style={styles.badgeInactive}>Inativo</span>
                          )}
                        </td>
                        <td style={{...styles.td, textAlign: 'center'}}>
                          <button style={styles.iconBtn} onClick={() => abrirModalPagamento(forma)} title="Editar">
                            <Edit size={14} />
                          </button>
                          {forma.ativo ? (
                            !forma.isSistema && (
                              <button
                                style={{...styles.iconBtn, color: '#ef4444'}}
                                onClick={() => removerPagamento(forma)}
                                title="Desativar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )
                          ) : (
                            <button
                              style={{...styles.iconBtn, color: '#4ade80'}}
                              onClick={() => reativarPagamento(forma)}
                              title="Reativar"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '40px'}}>Taxas de Crédito por Parcela</h3>
              <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5'}}>
                Configure a grade 1x–12x por maquininha de crédito. O <strong>padrão da loja</strong> é usado
                como fallback quando a maquininha não tiver grade própria.
              </p>

              <div style={{ marginBottom: '16px', maxWidth: '420px' }}>
                <label style={styles.label}>Maquininha / adquirente</label>
                <select
                  style={styles.input}
                  value={maquininhaTaxasId}
                  onChange={(e) => setMaquininhaTaxasId(e.target.value)}
                >
                  <option value="">Padrão da loja (fallback)</option>
                  {formasCredito.map((forma) => (
                    <option key={forma.id} value={forma.id}>{forma.nome}</option>
                  ))}
                </select>
              </div>

              <div style={styles.tableWrapper}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                  <button style={styles.btnOutline} type="button" onClick={restaurarTaxasPadrao}>
                    Restaurar padrão
                  </button>
                  <button style={styles.btnAction} type="button" onClick={salvarTaxasCredito} disabled={salvandoTaxas}>
                    <Save size={14} /> {salvandoTaxas ? 'Salvando...' : 'Salvar Taxas de Crédito'}
                  </button>
                </div>

                <div style={styles.taxasGrid}>
                  {Array.from({ length: 12 }, (_, index) => {
                    const parcelas = index + 1;
                    return (
                      <div key={parcelas} style={styles.taxaCard}>
                        <label style={styles.taxaLabel}>{parcelas}x</label>
                        <div style={styles.taxaInputWrap}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={styles.taxaInput}
                            value={taxasCredito[parcelas] ?? 0}
                            onChange={(e) => atualizarTaxaParcela(parcelas, e.target.value)}
                          />
                          <span style={styles.taxaSuffix}>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '40px'}}>Regras e Categorias Financeiras</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Plano de contas e editor de listas persistente entram em breve. Por enquanto, categorias financeiras não são editáveis aqui.
              </p>
            </div>
          )}

          {/* --- DOCUMENTOS E IMPRESSÃO (DYNAMIC TEMPLATING) --- */}
          {abaAtiva === 'documentos' && (
            <div style={{...styles.formSection, maxWidth: '900px'}}>
              <h3 style={styles.sectionTitle}>Modelos de Recibos, Contratos e Garantias</h3>
              <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5'}}>
                Nesta seção você pode editar os termos legais que saem impressos nos documentos do sistema. 
                Utilize as <strong>Variáveis Disponíveis</strong> para que o sistema preencha os dados automaticamente.
              </p>
              {(() => {
                const diag = diagnosticoTermosConsulta({ termoOS, termoOSSaida, termoGarantia });
                if (diag.osEntradaOk && diag.osSaidaOk && diag.garantiaOk) return null;
                return (
                  <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    color: '#fbbf24',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}>
                    Um ou mais termos estão sem cláusula clara de consultas (CPF/IMEI/Anatel).
                    Use <strong>Padrão</strong> em cada termo ou inclua a cláusula antes de operar consultas.
                  </div>
                );
              })()}

              <div style={{backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
                <span style={{fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>VARIÁVEIS DISPONÍVEIS (Clique para copiar):</span>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  {['[NOME_EMPRESA]', '[CNPJ_EMPRESA]', '[NOME_CLIENTE]', '[CPF_CLIENTE]', '[DATA_VENDA]', '[NOME_VENDEDOR]', '[PRAZO_GARANTIA]', '[NUMERO_RECIBO]', '[CODIGO_OS]', '[MODELO_APARELHO]', '[IMEI]', '[DATA_ENTRADA]'].map(tag => (
                    <span key={tag} style={styles.varTag} onClick={() => navigator.clipboard.writeText(tag)}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px', gap: '8px', flexWrap: 'wrap'}}>
                  <label style={{...styles.label, color: '#e2e8f0', fontSize: '14px'}}>Termo de Garantia (Recibo de Venda):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={styles.btnActionSecondary}
                      onClick={async () => {
                        const ok = await confirm('Restaurar o termo de garantia padrão (com cláusula de consultas)?', {
                          title: 'Restaurar padrão',
                          confirmLabel: 'Restaurar',
                        });
                        if (ok) setTermoGarantia(TERMO_GARANTIA_PADRAO);
                      }}
                    >
                      <RotateCcw size={14} /> Padrão
                    </button>
                    <button 
                      style={{...styles.btnActionSecondary, backgroundColor: previewGarantia ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}} 
                      onClick={() => setPreviewGarantia(!previewGarantia)}
                    >
                      {previewGarantia ? <EyeOff size={14}/> : <Eye size={14}/>}
                      {previewGarantia ? 'Voltar para Edição' : 'Pré-visualizar (MOCK)'}
                    </button>
                  </div>
                </div>
                
                {previewGarantia ? (
                  <div style={styles.previewBox}>
                    {gerarPreview(termoGarantia)}
                  </div>
                ) : (
                  <textarea 
                    style={{...styles.input, minHeight: '200px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'monospace'}} 
                    value={termoGarantia}
                    onChange={(e) => setTermoGarantia(e.target.value)}
                  />
                )}
              </div>
              
              <div style={{...styles.inputGroup, marginTop: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px', gap: '8px', flexWrap: 'wrap'}}>
                  <label style={{...styles.label, color: '#e2e8f0', fontSize: '14px'}}>Termo de Entrada (Ordem de Serviço):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={styles.btnActionSecondary}
                      onClick={async () => {
                        const ok = await confirm('Restaurar o termo de entrada padrão (com cláusula de consultas)?', {
                          title: 'Restaurar padrão',
                          confirmLabel: 'Restaurar',
                        });
                        if (ok) setTermoOS(TERMO_OS_PADRAO);
                      }}
                    >
                      <RotateCcw size={14} /> Padrão
                    </button>
                    <button 
                      style={{...styles.btnActionSecondary, backgroundColor: previewOS ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}} 
                      onClick={() => setPreviewOS(!previewOS)}
                    >
                      {previewOS ? <EyeOff size={14}/> : <Eye size={14}/>}
                      {previewOS ? 'Voltar para Edição' : 'Pré-visualizar (MOCK)'}
                    </button>
                  </div>
                </div>

                {previewOS ? (
                  <div style={styles.previewBox}>
                    {gerarPreview(termoOS)}
                  </div>
                ) : (
                  <textarea 
                    style={{...styles.input, minHeight: '150px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'monospace'}} 
                    value={termoOS}
                    onChange={(e) => setTermoOS(e.target.value)}
                  />
                )}
              </div>

              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Exigir termo de entrada na OS</h4>
                  <p style={styles.toggleDesc}>Cliente deve aceitar o termo e assinar antes de concluir a entrada do aparelho.</p>
                </div>
                <Switch ativo={exigirTermoEntrada} onClick={() => setExigirTermoEntrada((v) => !v)} />
              </div>

              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Exigir foto na entrada</h4>
                  <p style={styles.toggleDesc}>Ao menos uma foto do aparelho no estado de entrada.</p>
                </div>
                <Switch ativo={exigirFotoEntrada} onClick={() => setExigirFotoEntrada((v) => !v)} />
              </div>

              <div style={{...styles.inputGroup, marginTop: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px', gap: '8px', flexWrap: 'wrap'}}>
                  <label style={{...styles.label, color: '#e2e8f0', fontSize: '14px'}}>Termo de Saída (Ordem de Serviço):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={styles.btnActionSecondary}
                      onClick={async () => {
                        const ok = await confirm('Restaurar o termo de saída padrão (com cláusula de consultas)?', {
                          title: 'Restaurar padrão',
                          confirmLabel: 'Restaurar',
                        });
                        if (ok) setTermoOSSaida(TERMO_OS_SAIDA_PADRAO);
                      }}
                    >
                      <RotateCcw size={14} /> Padrão
                    </button>
                    <button
                      style={{...styles.btnActionSecondary, backgroundColor: previewOSSaida ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}}
                      onClick={() => setPreviewOSSaida(!previewOSSaida)}
                    >
                      {previewOSSaida ? <EyeOff size={14}/> : <Eye size={14}/>}
                      {previewOSSaida ? 'Voltar para Edição' : 'Pré-visualizar (MOCK)'}
                    </button>
                  </div>
                </div>

                {previewOSSaida ? (
                  <div style={styles.previewBox}>
                    {gerarPreview(termoOSSaida)}
                  </div>
                ) : (
                  <textarea
                    style={{...styles.input, minHeight: '150px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'monospace'}}
                    value={termoOSSaida}
                    onChange={(e) => setTermoOSSaida(e.target.value)}
                  />
                )}
              </div>

              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Exigir termo de saída na OS</h4>
                  <p style={styles.toggleDesc}>Cliente deve assinar na retirada do aparelho antes de finalizar a OS.</p>
                </div>
                <Switch ativo={exigirTermoSaida} onClick={() => setExigirTermoSaida((v) => !v)} />
              </div>

              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Exigir foto na saída</h4>
                  <p style={styles.toggleDesc}>Ao menos uma foto do aparelho no momento da retirada.</p>
                </div>
                <Switch ativo={exigirFotoSaida} onClick={() => setExigirFotoSaida((v) => !v)} />
              </div>

              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Bloquear kanban sem entrada completa</h4>
                  <p style={styles.toggleDesc}>Impede mover a OS no painel técnico enquanto termo/fotos de entrada estiverem pendentes.</p>
                </div>
                <Switch ativo={bloquearKanbanSemEntrada} onClick={() => setBloquearKanbanSemEntrada((v) => !v)} />
              </div>

            </div>
          )}

          {abaAtiva === 'plano' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Plano da loja</h3>
              <LojaPlanoPanel />
            </div>
          )}

          {abaAtiva === 'equipe' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Equipe e convites</h3>
              <LojaEquipePanel />
            </div>
          )}

          {abaAtiva === 'creditos' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Créditos da loja</h3>
              <LojaCreditosPanel />
            </div>
          )}

          {/* --- FISCAL --- */}
          {abaAtiva === 'fiscal' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>NFC-e / NF-e</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', lineHeight: 1.45 }}>
                NFC-e exige plano Profissional ou Rede (libera o módulo) + créditos na carteira
                (4 por emissão autorizada) + token Focus. Cadastre o token, preencha NCM nos produtos
                e use homologação até validar com a SEFAZ.
              </p>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Ambiente</label>
                  <select
                    style={styles.input}
                    value={fiscal.nfeAmbiente}
                    onChange={(e) => setFiscal({ ...fiscal, nfeAmbiente: e.target.value })}
                  >
                    <option value="homologacao">Homologação (testes)</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Provedor</label>
                  <select
                    style={styles.input}
                    value={fiscal.fiscalProvider === 'mock' ? 'focus' : fiscal.fiscalProvider}
                    onChange={(e) => setFiscal({ ...fiscal, fiscalProvider: e.target.value })}
                  >
                    <option value="focus">Focus NFe</option>
                  </select>
                  <p style={{ color: '#94a3b8', fontSize: '11px', margin: '6px 0 0', lineHeight: 1.4 }}>
                    Emissão real exige token Focus abaixo e créditos na carteira (4 por NFC-e autorizada).
                    O plano Profissional libera o módulo; os créditos pagam o uso da API.
                  </p>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Série NFC-e</label>
                  <input
                    style={styles.input}
                    type="number"
                    min={1}
                    value={fiscal.nfceSerie}
                    onChange={(e) => setFiscal({ ...fiscal, nfceSerie: e.target.value })}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Última NFC-e emitida</label>
                  <input style={styles.input} disabled value={fiscal.nfceUltimoNumero ?? 0} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Série NF-e</label>
                  <input
                    style={styles.input}
                    type="number"
                    min={1}
                    value={fiscal.nfeSerie}
                    onChange={(e) => setFiscal({ ...fiscal, nfeSerie: e.target.value })}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Última NF-e emitida</label>
                  <input style={styles.input} disabled value={fiscal.nfeUltimoNumero ?? 0} />
                </div>
              </div>

              <div style={{ ...styles.toggleRow, marginTop: '20px' }}>
                <div>
                  <h4 style={styles.toggleTitle}>Emitir NFC-e automaticamente no PDV</h4>
                  <p style={styles.toggleDesc}>
                    Ao concluir a venda, tenta emitir NFC-e na Focus e debita 4 créditos somente se autorizada.
                    Falha ou rejeição não consome créditos.
                  </p>
                </div>
                <Switch
                  ativo={fiscal.emitirNfceAuto}
                  onClick={() => setFiscal({ ...fiscal, emitirNfceAuto: !fiscal.emitirNfceAuto })}
                />
              </div>

              <h3 style={{ ...styles.sectionTitle, marginTop: '30px' }}>Token Focus NFe</h3>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px', lineHeight: 1.45 }}>
                Status: {focusTokenConfigurado ? 'configurado' : 'não configurado'}.
                O token fica só no servidor (não aparece de novo após salvar).
              </p>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Novo token (empresa Focus)</label>
                  <input
                    style={styles.input}
                    type="password"
                    value={focusTokenInput}
                    onChange={(e) => setFocusTokenInput(e.target.value)}
                    placeholder="Cole o token aqui"
                    autoComplete="off"
                  />
                </div>
                <div style={{ ...styles.inputGroup, justifyContent: 'flex-end', flexDirection: 'row', gap: '8px', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    style={styles.btnUpload}
                    disabled={salvandoToken || !focusTokenInput.trim()}
                    onClick={async () => {
                      if (!lojaAtivaId) return;
                      setSalvandoToken(true);
                      const { error } = await salvarFocusNfeToken(lojaAtivaId, focusTokenInput.trim());
                      setSalvandoToken(false);
                      if (error) {
                        await alert(error.message ?? 'Não foi possível salvar o token.', { type: 'error', title: 'Erro' });
                        return;
                      }
                      setFocusTokenConfigurado(true);
                      setFocusTokenInput('');
                      await alert('Token Focus salvo.', { type: 'success', title: 'Sucesso' });
                    }}
                  >
                    {salvandoToken ? 'Salvando…' : 'Salvar token'}
                  </button>
                  {focusTokenConfigurado && (
                    <button
                      type="button"
                      style={{ ...styles.btnUpload, backgroundColor: '#7f1d1d' }}
                      disabled={salvandoToken}
                      onClick={async () => {
                        const ok = await confirm('Remover o token Focus desta loja?', { title: 'Confirmar' });
                        if (!ok || !lojaAtivaId) return;
                        setSalvandoToken(true);
                        const { error } = await removerFocusNfeToken(lojaAtivaId);
                        setSalvandoToken(false);
                        if (error) {
                          await alert(error.message ?? 'Falha ao remover.', { type: 'error', title: 'Erro' });
                          return;
                        }
                        setFocusTokenConfigurado(false);
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Certificado Digital</h3>
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '10px' }}>
                Com Focus NFe, o certificado costuma ficar na conta Focus. Upload A1 no Phone Gestor
                entra em uma próxima etapa se for necessário para o seu modelo.
              </p>
              <div style={{...styles.logoUploadArea, marginTop: '10px', opacity: 0.85}}>
                <div style={{...styles.logoPlaceholder, width: '40px', height: '40px', borderRadius: '4px'}}><FileText size={20}/></div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', flex: 1}}>
                  <span style={{color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold'}}>Certificado (.pfx, .p12)</span>
                  <span style={{color: '#94a3b8', fontSize: '12px'}}>
                    Upload local ainda não disponível — configure o certificado na Focus por enquanto.
                    {fiscal.certificadoPath ? ` Arquivo atual: ${fiscal.certificadoPath}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* --- RELATÓRIOS --- */}
          {abaAtiva === 'relatorios' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Configurações de Relatórios</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Os relatórios operacionais estão no menu Relatórios. Resumo diário por e-mail ainda não está disponível —
                quando existir, a preferência será configurada aqui.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* --- MODAL DE FORMA DE PAGAMENTO --- */}
      {modalPagamentoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{formDataPagamento.id ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</h3>
              <button style={styles.btnClose} onClick={() => setModalPagamentoAberto(false)}><X size={20} /></button>
            </div>
            
            <div style={{...styles.grid2, marginTop: '20px'}}>
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.required}>*</span> Nome (Ex: Crédito Stone 12x):</label>
                <input 
                  style={styles.input} 
                  value={formDataPagamento.nome}
                  onChange={(e) => setFormDataPagamento({...formDataPagamento, nome: e.target.value})}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.required}>*</span> Tipo Base:</label>
                <select 
                  style={styles.input}
                  value={formDataPagamento.tipo}
                  disabled={formDataPagamento.isSistema}
                  onChange={(e) => setFormDataPagamento({...formDataPagamento, tipo: e.target.value})}
                >
                  {TIPOS_FORMA_UI.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.required}>*</span> Taxa da Operadora (%):</label>
                <input 
                  style={styles.input} 
                  type="number"
                  placeholder="Ex: 3.49"
                  disabled={formDataPagamento.isSistema}
                  value={formDataPagamento.taxa}
                  onChange={(e) => setFormDataPagamento({...formDataPagamento, taxa: e.target.value})}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Prazo de Recebimento:</label>
                <input 
                  style={styles.input} 
                  placeholder="Ex: 1 dia (D+1), Na hora..."
                  value={formDataPagamento.prazo}
                  onChange={(e) => setFormDataPagamento({...formDataPagamento, prazo: e.target.value})}
                />
              </div>
              {formDataPagamento.id && !formDataPagamento.isSistema && (
                <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                  <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formDataPagamento.ativo !== false}
                      onChange={(e) => setFormDataPagamento({ ...formDataPagamento, ativo: e.target.checked })}
                    />
                    Forma ativa (visível no PDV)
                  </label>
                </div>
              )}
            </div>

            {formDataPagamento.isSistema && (
              <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '12px' }}>
                Forma reservada do sistema — apenas o nome e prazo podem ser ajustados.
              </p>
            )}

            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalPagamentoAberto(false)}>Cancelar</button>
              <button style={styles.btnSaveModal} onClick={salvarPagamento} disabled={salvandoPagamento}>
                {salvandoPagamento ? 'Salvando...' : 'Salvar Forma de Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0f111a', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '85vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#11131c', padding: '24px', borderBottom: '1px solid #1f2233', borderRadius: '8px 8px 0 0' },
  title: { color: '#fff', fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px 0' },
  subtitle: { color: '#94a3b8', fontSize: '13px', margin: 0 },
  btnSave: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', transition: '0.2s' },
  
  mainArea: { display: 'flex', flex: 1, border: '1px solid #1f2233', borderRadius: '0 0 8px 8px', overflow: 'hidden' },
  
  settingsMenu: { width: '250px', backgroundColor: '#11131c', borderRight: '1px solid #1f2233', display: 'flex', flexDirection: 'column', padding: '20px 10px' },
  menuItem: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '12px 15px', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s', marginBottom: '4px' },
  menuItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', border: 'none', color: '#38bdf8', padding: '12px 15px', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },

  contentArea: { flex: 1, backgroundColor: '#161925', padding: '30px', overflowY: 'auto' },
  formSection: { maxWidth: '800px' },
  sectionTitle: { color: '#e2e8f0', fontSize: '16px', margin: '0 0 24px 0', borderBottom: '1px solid #1f2233', paddingBottom: '10px' },
  
  logoUploadArea: { display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#11131c', padding: '20px', borderRadius: '8px', border: '1px dashed #2a2e3f', marginBottom: '24px' },
  logoPlaceholder: { width: '60px', height: '60px', backgroundColor: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', fontWeight: 'bold' },
  btnUpload: { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', marginTop: '6px' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '10px 14px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none' },

  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#11131c', padding: '20px', borderRadius: '8px', border: '1px solid #1f2233', marginBottom: '20px' },
  toggleTitle: { color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0' },
  toggleDesc: { color: '#94a3b8', fontSize: '12px', margin: 0, maxWidth: '80%' },
  inputNumber: {
    width: '80px', backgroundColor: '#0b0c10', border: '1px solid #2a2e3f',
    borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', textAlign: 'center',
  },

  /* Variáveis Tags */
  varTag: { backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'copy', border: '1px dashed #38bdf8', transition: '0.2s' },
  btnActionSecondary: { backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  
  /* Preview Box */
  previewBox: { backgroundColor: '#11131c', border: '1px dashed #4ade80', borderRadius: '6px', padding: '15px', color: '#e2e8f0', fontSize: '13px', whiteSpace: 'pre-wrap', minHeight: '150px', lineHeight: '1.6', fontFamily: 'monospace' },

  /* Tabela de Formas de Pagamento */
  tableWrapper: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', padding: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233' },
  td: { padding: '12px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233' },
  tr: { transition: '0.2s' },
  badgeSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeInactive: { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeSistema: { backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' },
  btnAction: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  taxasGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' },
  taxaCard: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  taxaLabel: { color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' },
  taxaInputWrap: { display: 'flex', alignItems: 'center', gap: '6px' },
  taxaInput: { flex: 1, backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '8px 10px', color: '#fff', fontSize: '13px', outline: 'none', width: '100%' },
  taxaSuffix: { color: '#64748b', fontSize: '12px', fontWeight: 'bold' },
  iconBtn: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' },

  /* Estilos do Modal */
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '500px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '10px' },
  modalTitle: { margin: 0, color: '#fff', fontSize: '16px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalFooter: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '16px' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  btnSaveModal: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }
};

export default Configuracoes;