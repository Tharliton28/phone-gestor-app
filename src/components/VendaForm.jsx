import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Save, Plus, Search, X, Trash2, 
  DollarSign, Percent, Eraser, CreditCard, Calculator, 
  AlertCircle, CheckCircle, Smartphone, Info, ChevronDown
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useErpNavigation } from '../hooks/useErpNavigation';
import { listPessoasResumo } from '../services/pessoaService';
import { listProdutos, TIPO_LABEL } from '../services/produtoService';
import { formatFormaPagamentoLabel, listFormasPagamento, opcoesParcelasPorForma } from '../services/formaPagamentoService';
import { getLojaConfig, permiteVendaSemEstoque } from '../services/lojaConfigService';
import { emitirNfceParaVenda } from '../services/fiscalService';
import { createVenda, STATUS_UI_TO_DB } from '../services/vendaService';
import { getOrcamentoById, buildPdvPreloadFromOrcamento, validarOrcamentoParaPdv } from '../services/orcamentoService';
import { formatCpfCnpj, formatBRL } from '../utils/formatters';
import CurrencyInput from './CurrencyInput';
import {
  calcItemTotal,
  calcVendaTotais,
  calcTotalPago,
  calcValorRestante,
  calcTroco,
  pagamentoCompleto,
  calcDescontoFromInput,
  aplicarRepassarTaxa,
  removerRepassarTaxa,
  podeAgruparCarrinho,
  parseNumeroParcelas,
  calcValorParcela,
} from '../domain/vendaCalculos';

const CONSUMIDOR_FINAL = 'Consumidor Final (Padrão)';

// ============================================================================
// COMPONENTE CUSTOMIZADO: SELECT PESQUISÁVEL
// ============================================================================
const SelectPesquisavel = ({ opcoes, valorSelecionado, aoMudar, placeholder }) => {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const ref = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const opcoesFiltradas = opcoes.filter(opcao => 
    opcao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Botão que parece um Select normal */}
      <div 
        style={styles.selectHeader} 
        onClick={() => { setAberto(!aberto); setBusca(''); }}
      >
        <span style={{ color: valorSelecionado ? '#fff' : '#64748b', fontSize: '13px' }}>
          {valorSelecionado || placeholder}
        </span>
        <ChevronDown size={14} color="#64748b" />
      </div>
      
      {aberto && (
        <div style={styles.selectDropdown}>
          <div style={styles.selectSearchContainer}>
            <Search size={14} color="#64748b" style={styles.selectSearchIcon} />
            <input
              autoFocus
              style={styles.selectSearchInput}
              placeholder="Pesquisar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div style={styles.selectOptionsContainer}>
            {opcoesFiltradas.length > 0 ? (
              opcoesFiltradas.map((opcao, index) => (
                <div 
                  key={index} 
                  style={styles.selectOption}
                  onClick={() => {
                    aoMudar(opcao);
                    setAberto(false);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f2233'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {opcao}
                </div>
              ))
            ) : (
              <div style={{ padding: '10px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
                Nenhum resultado encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TELA PRINCIPAL: VENDA FORM
// ============================================================================
const VendaForm = ({ dadosNavegacao }) => {
  const { irParaListagemVendas } = useErpNavigation();
  const { lojaAtivaId, perfil } = useLoja();
  const orcamentoIdPreload = dadosNavegacao?.orcamentoId ?? null;

  // ==========================================
  // ESTADOS GERAIS E CADASTROS
  // ==========================================
  const [clienteLabel, setClienteLabel] = useState(CONSUMIDOR_FINAL);
  const [clienteId, setClienteId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [permiteRuptura, setPermiteRuptura] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10));

  const vendedor = perfil?.nome ?? 'Vendedor';

  const { listaClientes, clienteMap } = useMemo(() => {
    const map = { [CONSUMIDOR_FINAL]: null };
    const opcoes = [CONSUMIDOR_FINAL];
    clientes.forEach((pessoa) => {
      const label = pessoa.cpf_cnpj
        ? `${pessoa.nome} - ${formatCpfCnpj(pessoa.cpf_cnpj)}`
        : pessoa.nome;
      map[label] = pessoa.id;
      opcoes.push(label);
    });
    return { listaClientes: opcoes, clienteMap: map };
  }, [clientes]);

  const { listaPagamentos, formaMap } = useMemo(() => {
    const map = {};
    const opcoes = formasPagamento.map((forma) => {
      const label = formatFormaPagamentoLabel(forma);
      map[label] = forma;
      return label;
    });
    if (!opcoes.includes('Aparelho Usado (Entrada)')) {
      opcoes.push('Aparelho Usado (Entrada)');
    }
    return { listaPagamentos: opcoes, formaMap: map };
  }, [formasPagamento]);

  // ==========================================
  // ESTADOS DO CARRINHO E VALORES GERAIS
  // ==========================================
  const [carrinho, setCarrinho] = useState([]);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  
  const [descontoGlobal, setDescontoGlobal] = useState(0);
  const [statusVenda, setStatusVenda] = useState('Concluído');

  // ==========================================
  // ESTADOS DOS MODAIS PROFISSIONAIS
  // ==========================================
  const [modalDescontoAberto, setModalDescontoAberto] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState('rs'); 
  const [valorDescontoInput, setValorDescontoInput] = useState(0);

  const [modalTrocoAberto, setModalTrocoAberto] = useState(false);
  const [valorEntregueTroco, setValorEntregueTroco] = useState(0);

  const [modalExcluirPagamento, setModalExcluirPagamento] = useState({ aberto: false, id: null });
  
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });

  const [modalAparelhoAberto, setModalAparelhoAberto] = useState(false);
  const [aparelhoEntrada, setAparelhoEntrada] = useState({ modelo: '', imei: '', valor: 0 });

  // ==========================================
  // ESTADOS DE PAGAMENTO
  // ==========================================
  const criarLinhaPagamento = (valor = 0, autoPreenchido = false) => ({
    id: Date.now() + Math.random(),
    forma: '',
    formaPagamentoId: null,
    formaNome: '',
    formaTipo: null,
    valor,
    valorBase: valor,
    valorTaxa: 0,
    parcelas: 'À vista',
    detalhes: '',
    taxa: 0,
    taxaRepassada: false,
    autoPreenchido,
    aparelhoEntrada: null,
  });

  const acaoAvisoRef = useRef(null);

  const [pagamentos, setPagamentos] = useState([criarLinhaPagamento()]);
  const [orcamentoOrigemId, setOrcamentoOrigemId] = useState(orcamentoIdPreload);
  const [preloadOrcamentoFeito, setPreloadOrcamentoFeito] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!lojaAtivaId) return;

    const [clientesResult, produtosResult, formasResult, configResult] = await Promise.all([
      listPessoasResumo(lojaAtivaId, { categoria: 'cliente' }),
      listProdutos(lojaAtivaId),
      listFormasPagamento(lojaAtivaId),
      getLojaConfig(lojaAtivaId),
    ]);

    if (!clientesResult.error && clientesResult.data?.length) {
      setClientes(clientesResult.data);
    } else {
      const fallback = await listPessoasResumo(lojaAtivaId);
      setClientes(fallback.data ?? []);
    }

    if (!produtosResult.error) setProdutos(produtosResult.data ?? []);
    if (!formasResult.error) setFormasPagamento(formasResult.data ?? []);
    if (!configResult.error && configResult.data) {
      setPermiteRuptura(permiteVendaSemEstoque(configResult.data));
    }
  }, [lojaAtivaId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (!lojaAtivaId || !orcamentoIdPreload || preloadOrcamentoFeito || !formasPagamento.length) {
      return;
    }

    let cancelado = false;

    (async () => {
      const { data, error } = await getOrcamentoById(lojaAtivaId, orcamentoIdPreload);

      if (cancelado) return;

      if (error || !data) {
        mostrarAviso('Orçamento', error?.message ?? 'Não foi possível carregar o orçamento.', 'erro');
        setPreloadOrcamentoFeito(true);
        return;
      }

      const validacao = validarOrcamentoParaPdv(data);
      if (!validacao.ok) {
        mostrarAviso('Orçamento', validacao.error.message, 'erro');
        setPreloadOrcamentoFeito(true);
        return;
      }

      const preload = buildPdvPreloadFromOrcamento(data, formasPagamento);

      if (preload.clienteId) {
        setClienteId(preload.clienteId);
        const pessoa = clientes.find((c) => c.id === preload.clienteId);
        if (pessoa) {
          const label = pessoa.cpf_cnpj
            ? `${pessoa.nome} - ${formatCpfCnpj(pessoa.cpf_cnpj)}`
            : pessoa.nome;
          setClienteLabel(label);
        } else if (data.cliente?.nome) {
          setClienteLabel(data.cliente.nome);
        }
      }

      setCarrinho(preload.carrinho);
      setDescontoGlobal(preload.descontoGlobal);
      setPagamentos(preload.pagamentos);
      setOrcamentoOrigemId(preload.orcamentoId);
      setPreloadOrcamentoFeito(true);

      mostrarAviso(
        'Orçamento carregado',
        `Itens do orçamento #${data.codigo} foram transferidos para o PDV. Revise pagamentos e finalize a venda.`,
        'info'
      );
    })();

    return () => {
      cancelado = true;
    };
  }, [lojaAtivaId, orcamentoIdPreload, preloadOrcamentoFeito, formasPagamento, clientes]);

  const produtosDisponiveis = useMemo(() => {
    return (produtos ?? []).map((produto) => ({
      id: produto.id,
      produtoId: produto.id,
      codigo: produto.codigo,
      nome: produto.nome,
      imei: produto.imei1 ?? null,
      preco: Number(produto.valor_venda) || 0,
      tipo: TIPO_LABEL[produto.tipo] ?? produto.tipo,
      estoque: produto.quantidade_atual ?? 0,
    }));
  }, [produtos]);

  const mostrarAviso = (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    acaoAvisoRef.current = acaoOk;
    setModalAviso({ aberto: true, titulo, mensagem, tipo });
  };

  // ==========================================
  // LÓGICA DO CARRINHO
  // ==========================================
  const adicionarAoCarrinho = (produto) => {
    if (!permiteRuptura && produto.estoque <= 0) {
      return mostrarAviso(
        'Sem estoque',
        `"${produto.nome}" está sem saldo. Ative a ruptura em Configurações ou faça uma entrada de estoque.`,
        'erro'
      );
    }

    const existente = carrinho.find((item) => podeAgruparCarrinho(produto, item));
    if (existente) {
      const novaQtd = existente.quantidade + 1;
      if (!permiteRuptura && novaQtd > produto.estoque) {
        return mostrarAviso(
          'Estoque insuficiente',
          `Saldo disponível: ${produto.estoque} un.`,
          'erro'
        );
      }
      setCarrinho(carrinho.map((item) =>
        item.idCarrinho === existente.idCarrinho ? { ...item, quantidade: novaQtd } : item
      ));
    } else if (produto.imei && carrinho.some((item) => item.produtoId === produto.id)) {
      return mostrarAviso('Aparelho duplicado', 'Este aparelho já está no carrinho.', 'erro');
    } else {
      const item = { ...produto, idCarrinho: Date.now(), quantidade: 1, precoEditavel: produto.preco };
      setCarrinho([...carrinho, item]);
    }

    setModalProdutoAberto(false);
    setBuscaProduto('');
  };

  const removerDoCarrinho = (idCarrinho) => setCarrinho(carrinho.filter(i => i.idCarrinho !== idCarrinho));

  const atualizarItem = (idCarrinho, campo, valor) => {
    setCarrinho(carrinho.map((item) => {
      if (item.idCarrinho !== idCarrinho) return item;
      if (campo === 'preco') {
        return { ...item, preco: Math.max(0, Number(valor) || 0) };
      }
      const qtd = Math.max(1, Number(valor) || 1);
      if (!permiteRuptura && qtd > item.estoque) {
        mostrarAviso('Estoque insuficiente', `Saldo disponível: ${item.estoque} un.`, 'erro');
        return item;
      }
      return { ...item, quantidade: qtd };
    }));
  };

  const totais = calcVendaTotais(carrinho, descontoGlobal, pagamentos);
  const { valorSubtotal: subtotalItens, valorTotal: totalGeral, valorTaxas, valorAcrescimo } = totais;
  const totalPago = calcTotalPago(pagamentos);
  const valorRestante = calcValorRestante(totalGeral, pagamentos);
  const trocoCalculado = calcTroco(totalGeral, pagamentos);
  const pagamentoOk = pagamentoCompleto(totalGeral, pagamentos);

  const abrirModalDesconto = (tipo) => {
    setTipoDesconto(tipo);
    setValorDescontoInput(0);
    setModalDescontoAberto(true);
  };

  const confirmarDesconto = () => {
    const valorCalculado = calcDescontoFromInput(tipoDesconto, valorDescontoInput, subtotalItens);
    if (valorCalculado >= 0) {
      setDescontoGlobal(valorCalculado);
    }
    setModalDescontoAberto(false);
  };

  const removerDesconto = () => {
    setDescontoGlobal(0);
  };

  const limparValoresExtras = () => {
    setDescontoGlobal(0);
    setPagamentos(pagamentos.map((p) => ({
      ...p,
      taxaRepassada: false,
      valorTaxa: 0,
      valorBase: p.valor,
    })));
  };

  const adicionarLinhaPagamento = () => {
    const valorSugerido = valorRestante > 0 ? valorRestante : 0;
    setPagamentos([...pagamentos, criarLinhaPagamento(valorSugerido)]);
  };

  const mudarFormaPagamento = (id, novaForma) => {
    const forma = formaMap[novaForma];
    const match = novaForma.match(/Taxa: ([\d.]+)%/);
    const taxaExtraida = forma ? Number(forma.taxa_percentual) : match ? parseFloat(match[1]) : 0;
    const opcoes = opcoesParcelasPorForma(forma);
    setPagamentos(pagamentos.map((pag) => (
      pag.id === id
        ? {
            ...pag,
            forma: novaForma,
            formaPagamentoId: forma?.id ?? null,
            formaNome: forma?.nome ?? novaForma,
            formaTipo: forma?.tipo ?? null,
            taxa: taxaExtraida,
            taxaRepassada: false,
            valorTaxa: 0,
            parcelas: opcoes.includes(pag.parcelas) ? pag.parcelas : 'À vista',
          }
        : pag
    )));
  };

  const atualizarPagamento = (id, campo, valor) => {
    setPagamentos(pagamentos.map((pag) => {
      if (pag.id !== id) return pag;
      const atualizado = { ...pag, [campo]: valor, autoPreenchido: campo === 'valor' ? false : pag.autoPreenchido };
      if (campo === 'valor') {
        atualizado.valorBase = valor;
        if (!atualizado.taxaRepassada) atualizado.valorTaxa = 0;
      }
      return atualizado;
    }));
  };

  const repassarTaxaAoCliente = (idPagamento) => {
    const pag = pagamentos.find((p) => p.id === idPagamento);
    if (!pag) return;
    const atualizado = aplicarRepassarTaxa(pag, pag.taxa);
    if (!atualizado) {
      return mostrarAviso('Atenção', 'Informe um valor de pagamento válido.', 'erro');
    }
    setPagamentos(pagamentos.map((p) => (p.id === idPagamento ? { ...atualizado, autoPreenchido: false } : p)));
  };

  const removerTaxaAoCliente = (idPagamento) => {
    const pag = pagamentos.find((p) => p.id === idPagamento);
    if (!pag) return;
    const { pagamento } = removerRepassarTaxa(pag, pag.taxa);
    setPagamentos(pagamentos.map((p) => (p.id === idPagamento ? { ...pagamento, autoPreenchido: false } : p)));
  };

  const confirmarRemocaoPagamento = () => {
    setPagamentos(pagamentos.filter(pag => pag.id !== modalExcluirPagamento.id));
    setModalExcluirPagamento({ aberto: false, id: null });
  };

  const confirmarAparelhoEntrada = () => {
    const valorNum = Number(aparelhoEntrada.valor) || 0;
    if (!aparelhoEntrada.modelo.trim() || valorNum <= 0) {
      return mostrarAviso('Atenção', 'Preencha o modelo e um valor de avaliação válido.', 'erro');
    }

    const detalhesStr = `${aparelhoEntrada.modelo.trim()}${aparelhoEntrada.imei ? ` (IMEI: ${aparelhoEntrada.imei})` : ''}`;

    setPagamentos([...pagamentos, {
      ...criarLinhaPagamento(valorNum),
      forma: 'Aparelho Usado (Entrada)',
      formaNome: 'Aparelho Usado (Entrada)',
      detalhes: detalhesStr,
      aparelhoEntrada: {
        modelo: aparelhoEntrada.modelo.trim(),
        imei: aparelhoEntrada.imei.trim(),
        valor: valorNum,
      },
    }]);

    setModalAparelhoAberto(false);
    mostrarAviso(
      'Aparelho adicionado',
      `${aparelhoEntrada.modelo} foi incluído como forma de pagamento. O produto será cadastrado no estoque ao finalizar a venda.`,
      'sucesso'
    );
    setAparelhoEntrada({ modelo: '', imei: '', valor: 0 });
  };

  const finalizarVenda = async () => {
    if (!lojaAtivaId) return;
    if (carrinho.length === 0) return mostrarAviso('Atenção', 'Adicione produtos ao carrinho para vender.', 'erro');
    if (!pagamentoOk) {
      return mostrarAviso('Pagamento Incompleto', 'O valor total ainda não foi totalmente pago.', 'erro');
    }

    setSalvando(true);
    const statusDb = STATUS_UI_TO_DB[statusVenda] ?? 'concluido';
    const { data: vendaCriada, error } = await createVenda(
      lojaAtivaId,
      {
        clienteId,
        vendedorId: perfil?.id,
        status: statusDb,
        dataVenda,
        itens: carrinho,
        pagamentos,
        descontoGlobal,
        orcamentoId: orcamentoOrigemId,
      },
      perfil?.id
    );

    if (error) {
      setSalvando(false);
      return mostrarAviso('Erro', error.message ?? 'Não foi possível finalizar a venda.', 'erro');
    }

    let mensagemSucesso = statusVenda === 'Pré-Venda'
      ? 'Pré-venda registrada. O estoque será baixado ao concluir.'
      : 'A venda foi finalizada e salva com sucesso.';

    if (statusDb === 'concluido' && vendaCriada?.id) {
      const emit = await emitirNfceParaVenda({
        lojaId: lojaAtivaId,
        vendaId: vendaCriada.id,
        valorTotal: vendaCriada.valor_total,
        operadorId: perfil?.id,
      });

      if (emit.skipped) {
        // auto-emissão desligada ou já emitida
      } else if (emit.error) {
        mensagemSucesso += ` NFC-e não emitida: ${emit.error.message}`;
      } else if (emit.data) {
        mensagemSucesso += ` NFC-e ${emit.data.serie}/${emit.data.numero} registrada (${emit.data.status}).`;
      }
    }

    setSalvando(false);
    irParaListagemVendas({ mensagemSucesso });
  };

  useEffect(() => {
    if (carrinho.length === 0) {
      setPagamentos([criarLinhaPagamento()]);
      setDescontoGlobal(0);
      return;
    }

    if (pagamentos.length === 1 && totalGeral > 0) {
      const unico = pagamentos[0];
      if (!unico.valor || unico.autoPreenchido) {
        setPagamentos([{
          ...unico,
          valor: totalGeral,
          valorBase: totalGeral,
          autoPreenchido: true,
        }]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrinho.length, totalGeral]);

  const produtosFiltrados = produtosDisponiveis.filter((p) =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
    String(p.codigo).includes(buscaProduto) ||
    (p.imei && p.imei.includes(buscaProduto))
  );

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button type="button" onClick={() => irParaListagemVendas()} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>Nova Venda - PDV</h2>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={{...styles.btnSave, opacity: (!pagamentoOk || carrinho.length === 0 || salvando) ? 0.5 : 1}} 
            onClick={finalizarVenda}
            disabled={salvando || !pagamentoOk || carrinho.length === 0}
          >
            <Save size={16} /> {salvando ? 'Salvando...' : 'Finalizar Venda'}
          </button>
        </div>
      </div>

      <div style={styles.content}>
        
        {/* DADOS GERAIS */}
        <div style={styles.section}>
          <div style={styles.grid5}>
            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}>Cliente:</label>
              {/* SELECT PESQUISÁVEL: CLIENTE */}
              <SelectPesquisavel 
                opcoes={listaClientes}
                valorSelecionado={clienteLabel}
                aoMudar={(label) => {
                  setClienteLabel(label);
                  setClienteId(clienteMap[label] ?? null);
                }}
                placeholder="Buscar cliente..."
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Vendedor:</label>
              <input style={styles.input} value={vendedor} readOnly />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data da Venda:</label>
              <input style={styles.input} type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Status:</label>
              <select 
                style={{
                  ...styles.input, 
                  color: statusVenda === 'Concluído' ? '#4ade80' : statusVenda === 'Pré-Venda' ? '#fbbf24' : '#ef4444',
                  fontWeight: 'bold'
                }} 
                value={statusVenda} 
                onChange={(e) => setStatusVenda(e.target.value)}
              >
                <option value="Concluído" style={styles.optionItem}>Concluído</option>
                <option value="Pré-Venda" style={styles.optionItem}>Pré-Venda</option>
                <option value="Cancelada" style={styles.optionItem}>Cancelada</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRODUTOS DA VENDA */}
        <div style={styles.section}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3 style={styles.sectionTitle}>Produtos da Venda</h3>
            <button style={styles.btnPrimaryOutline} onClick={() => setModalProdutoAberto(true)}>
              <Plus size={14} /> Adicionar produto
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: '50%'}}>Produto</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Quantidade</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Valor unitário (R$)</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Total (R$)</th>
                  <th style={{...styles.th, textAlign: 'center', width: '60px'}}></th>
                </tr>
              </thead>
              <tbody>
                {carrinho.length === 0 ? (
                  <tr><td colSpan="5" style={{padding: '30px', textAlign: 'center', color: '#64748b'}}>Nenhum produto adicionado à venda.</td></tr>
                ) : (
                  carrinho.map((item) => (
                    <tr key={item.idCarrinho} style={styles.tr}>
                      <td style={{...styles.td, color: '#e2e8f0'}}>
                        <strong>{item.nome}</strong>
                        {item.imei && <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '4px'}}>IMEI: {item.imei}</div>}
                      </td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <input type="number" style={styles.inputMini} value={item.quantidade} min="1" onChange={(e) => atualizarItem(item.idCarrinho, 'quantidade', e.target.value)} />
                      </td>
                      <td style={{...styles.td, textAlign: 'right'}}>
                        <CurrencyInput
                          style={{...styles.inputMini, width: '110px', textAlign: 'right'}}
                          value={item.preco}
                          onChange={(valor) => atualizarItem(item.idCarrinho, 'preco', valor)}
                        />
                      </td>
                      <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#4ade80'}}>
                        {formatBRL(calcItemTotal(item.quantidade, item.preco))}
                      </td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <button style={styles.btnRemove} onClick={() => removerDoCarrinho(item.idCarrinho)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.totalsArea}>
            <div style={styles.discountControls}>
              <button style={styles.btnAction} onClick={() => abrirModalDesconto('rs')} disabled={carrinho.length === 0}><DollarSign size={14}/> Add Desconto (R$)</button>
              <button style={styles.btnActionGreen} onClick={() => abrirModalDesconto('perc')} disabled={carrinho.length === 0}><Percent size={14}/> Add Desconto (%)</button>
              {descontoGlobal > 0 && (
                <button style={styles.btnActionDanger} onClick={removerDesconto}>
                  <Eraser size={14}/> Remover Desconto
                </button>
              )}
            </div>
            <div style={styles.totalDisplay}>
              <span style={styles.totalLabel}>Subtotal: R$ {formatBRL(subtotalItens)}</span>
              {descontoGlobal > 0 && <span style={{color: '#fbbf24', fontSize: '14px'}}>- Desconto: R$ {formatBRL(descontoGlobal)}</span>}
              {valorTaxas > 0 && <span style={{color: '#ef4444', fontSize: '14px'}}>+ Taxas repassadas: R$ {formatBRL(valorTaxas)}</span>}
              {valorAcrescimo > valorTaxas && <span style={{color: '#ef4444', fontSize: '14px'}}>+ Acréscimos: R$ {formatBRL(valorAcrescimo - valorTaxas)}</span>}
              <span style={styles.totalBig}>Total: R$ {formatBRL(totalGeral)}</span>
            </div>
          </div>
        </div>

        {/* DADOS DO PAGAMENTO CONDICIONAL */}
        <div style={styles.section}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3 style={styles.sectionTitle}>Dados do Pagamento</h3>
            {carrinho.length > 0 && (
              <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                {valorRestante > 0 ? (
                  <span style={{color: '#ef4444', fontWeight: 'bold', fontSize: '14px'}}>Falta pagar: R$ {formatBRL(valorRestante)}</span>
                ) : trocoCalculado > 0 ? (
                  <span style={{color: '#4ade80', fontWeight: 'bold', fontSize: '14px'}}>Troco: R$ {formatBRL(trocoCalculado)}</span>
                ) : (
                  <span style={{color: '#94a3b8', fontWeight: 'bold', fontSize: '14px'}}>Valor pago integralmente.</span>
                )}
                <button style={styles.btnPrimaryOutline} onClick={adicionarLinhaPagamento}>
                  <Plus size={14}/> Adicionar Pagamento
                </button>
              </div>
            )}
          </div>
          
          {carrinho.length === 0 ? (
            <div style={{padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#0f111a', borderRadius: '8px', border: '1px dashed #2a2e3f'}}>
              <DollarSign size={32} color="#1f2233" style={{marginBottom: '10px'}} />
              <p style={{margin: 0, fontSize: '14px'}}>Adicione produtos à venda para liberar as opções de pagamento e entrada de aparelhos.</p>
            </div>
          ) : (
            <>
              {pagamentos.map((pag, index) => {
                const formaAtual = formaMap[pag.forma];
                const opcoesParcelas = opcoesParcelasPorForma(formaAtual);
                const numParcelas = parseNumeroParcelas(pag.parcelas);
                const valorParcela = calcValorParcela(pag.valor, pag.parcelas);

                return (
                <div key={pag.id} style={{...styles.grid4, marginBottom: '15px', paddingBottom: '15px', borderBottom: index < pagamentos.length - 1 ? '1px dashed #2a2e3f' : 'none', position: 'relative', zIndex: 10 - index }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Forma de pagamento:</label>
                    {/* SELECT PESQUISÁVEL: FORMA DE PAGAMENTO */}
                    <SelectPesquisavel 
                      opcoes={listaPagamentos}
                      valorSelecionado={pag.forma}
                      aoMudar={(novaForma) => mudarFormaPagamento(pag.id, novaForma)}
                      placeholder="Selecionar..."
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Valor Pago (R$):</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <CurrencyInput
                        style={{...styles.input, flex: 1}}
                        value={pag.valor}
                        onChange={(valor) => atualizarPagamento(pag.id, 'valor', valor)}
                      />
                      
                      {pag.taxa > 0 && !pag.taxaRepassada && (
                        <button style={styles.btnRepassarTaxa} onClick={() => repassarTaxaAoCliente(pag.id)}>
                          Repassar ({pag.taxa}%)
                        </button>
                      )}
                      {pag.taxaRepassada && (
                        <button style={styles.btnRemoverTaxa} onClick={() => removerTaxaAoCliente(pag.id)}>
                          <X size={12}/> Remover Taxa
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Parcelas:</label>
                    <select
                      style={styles.input}
                      value={pag.parcelas}
                      disabled={opcoesParcelas.length <= 1}
                      onChange={(e) => atualizarPagamento(pag.id, 'parcelas', e.target.value)}
                    >
                      {opcoesParcelas.map((opcao) => (
                        <option key={opcao} value={opcao}>{opcao}</option>
                      ))}
                    </select>
                    {numParcelas > 1 && pag.valor > 0 && (
                      <span style={{ fontSize: '11px', color: '#4ade80', marginTop: '6px', display: 'block' }}>
                        {numParcelas}x de R$ {formatBRL(valorParcela)}
                      </span>
                    )}
                    {formaAtual?.tipo && (
                      <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'block', textTransform: 'capitalize' }}>
                        Tipo: {formaAtual.tipo.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Detalhes:</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <input style={{...styles.input, flex: 1}} placeholder="NSU, Banco..." value={pag.detalhes} onChange={(e) => atualizarPagamento(pag.id, 'detalhes', e.target.value)} />
                      {pagamentos.length > 1 && (
                        <button style={styles.btnRemove} onClick={() => setModalExcluirPagamento({ aberto: true, id: pag.id })}><X size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}

              <div style={styles.paymentActions}>
                <button style={styles.btnActionGreen} onClick={() => setModalTrocoAberto(true)}><Calculator size={14}/> Calculadora de Troco</button>
                <button style={styles.btnActionGreen} onClick={() => setModalAparelhoAberto(true)}><Smartphone size={14}/> Entrada com Aparelho</button>
                <button style={styles.btnActionGreen} onClick={() => mostrarAviso('Em breve', 'Módulo de saldo/crédito em desenvolvimento.', 'info')}><CreditCard size={14}/> Usar crédito do cliente</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAIS DO SISTEMA                                         */}
      {/* ========================================================= */}

      {modalProdutoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px'}}>Buscar Produto</h3>
              <button style={styles.btnClose} onClick={() => setModalProdutoAberto(false)}><X size={20} /></button>
            </div>
            <div style={{padding: '20px 0'}}>
              <div style={styles.inputWithIcon}>
                <input style={{...styles.input, width: '100%', paddingLeft: '35px', padding: '12px 12px 12px 35px'}} placeholder="Buscar..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} autoFocus />
                <Search size={16} color="#64748b" style={{position: 'absolute', left: '12px'}} />
              </div>
              <div style={styles.modalProductList}>
                {produtosFiltrados.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum produto encontrado.</div>
                ) : produtosFiltrados.map((p) => (
                  <div key={p.id} style={styles.modalProductItem} onClick={() => adicionarAoCarrinho(p)}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span style={{color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold'}}>{p.nome}</span>
                      <span style={{color: '#64748b', fontSize: '11px'}}>
                        Cód: {p.codigo} | Estoque: {p.estoque} {p.imei && `| IMEI: ${p.imei}`}
                      </span>
                    </div>
                    <div style={{color: '#4ade80', fontWeight: 'bold'}}>R$ {formatBRL(p.preco)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalAviso.aberto && (
        <div style={styles.modalOverlay}>
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
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5'}}>{modalAviso.mensagem}</p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.btnSaveModal, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6', width: '100%'}} 
                onClick={() => {
                  const callback = acaoAvisoRef.current;
                  acaoAvisoRef.current = null;
                  setModalAviso({ aberto: false, titulo: '', mensagem: '', tipo: 'info' });
                  if (callback) callback();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAparelhoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px'}}>Aparelho como Entrada</h3>
              <button style={styles.btnClose} onClick={() => setModalAparelhoAberto(false)}><X size={20} /></button>
            </div>
            <div style={{padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Modelo do Aparelho:</label>
                <input style={styles.input} placeholder="Ex: iPhone 11 64GB Branco" value={aparelhoEntrada.modelo} onChange={(e) => setAparelhoEntrada({...aparelhoEntrada, modelo: e.target.value})} autoFocus />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>IMEI (Opcional):</label>
                <input style={styles.input} placeholder="Número do IMEI" value={aparelhoEntrada.imei} onChange={(e) => setAparelhoEntrada({...aparelhoEntrada, imei: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Valor de Avaliação (R$):</label>
                <CurrencyInput
                  style={styles.input}
                  value={aparelhoEntrada.valor}
                  onChange={(valor) => setAparelhoEntrada({ ...aparelhoEntrada, valor })}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalAparelhoAberto(false)}>Cancelar</button>
              <button style={styles.btnSaveModal} onClick={confirmarAparelhoEntrada}>Lançar e Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {modalDescontoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px'}}>Aplicar Desconto ({tipoDesconto === 'rs' ? 'R$' : '%'})</h3>
              <button style={styles.btnClose} onClick={() => setModalDescontoAberto(false)}><X size={20} /></button>
            </div>
            <div style={{padding: '20px 0'}}>
              {tipoDesconto === 'rs' ? (
                <CurrencyInput
                  style={{...styles.input, width: '100%'}}
                  value={valorDescontoInput}
                  onChange={setValorDescontoInput}
                  autoFocus
                />
              ) : (
                <input
                  style={{...styles.input, width: '100%'}}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={valorDescontoInput || ''}
                  onChange={(e) => setValorDescontoInput(Number(e.target.value) || 0)}
                  autoFocus
                  placeholder="Ex: 10"
                />
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalDescontoAberto(false)}>Cancelar</button>
              <button style={styles.btnSaveModal} onClick={confirmarDesconto}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalTrocoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px'}}>Calculadora de Troco</h3>
              <button style={styles.btnClose} onClick={() => setModalTrocoAberto(false)}><X size={20} /></button>
            </div>
            <div style={{padding: '20px 0'}}>
              <label style={styles.label}>Valor recebido (R$):</label>
              <CurrencyInput
                style={{...styles.input, width: '100%', fontSize: '20px'}}
                value={Number(valorEntregueTroco) || 0}
                onChange={(valor) => setValorEntregueTroco(valor)}
                autoFocus
              />
              {Number(valorEntregueTroco) > totalGeral && (
                <div style={{marginTop: '20px', padding: '15px', backgroundColor: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', textAlign: 'center'}}>
                  <span style={{color: '#4ade80', fontSize: '28px', fontWeight: 'bold'}}>R$ {formatBRL(Number(valorEntregueTroco) - totalGeral)}</span>
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={{...styles.btnSaveModal, width: '100%'}} onClick={() => setModalTrocoAberto(false)}>Fechar Calculadora</button>
            </div>
          </div>
        </div>
      )}

      {modalExcluirPagamento.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}><h3 style={{margin: 0, color: '#fff'}}>Remover Pagamento?</h3></div>
            <div style={{padding: '20px 0', color: '#94a3b8'}}>Deseja remover esta forma de pagamento da venda? Os valores serão recalculados.</div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalExcluirPagamento({aberto: false, id: null})}>Não</button>
              <button style={{...styles.btnSaveModal, backgroundColor: '#ef4444'}} onClick={confirmarRemocaoPagamento}>Sim, remover</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0f111a', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '85vh', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#11131c', padding: '20px 24px', borderBottom: '1px solid #1f2233', borderRadius: '8px 8px 0 0' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnSave: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', transition: '0.2s' },
  content: { padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' },
  section: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  sectionTitle: { color: '#e2e8f0', fontSize: '15px', margin: '0 0 15px 0', borderBottom: '1px solid #1f2233', paddingBottom: '10px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' },
  grid5: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }, 
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' },
  optionItem: { backgroundColor: '#11131c', color: '#e2e8f0' }, 
  inputMini: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '6px', color: '#fff', fontSize: '13px', width: '60px', textAlign: 'center', outline: 'none' },
  btnPrimaryOutline: { backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  btnRepassarTaxa: { backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnRemoverTaxa: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #1f2233', borderRadius: '6px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', backgroundColor: '#0f111a' },
  td: { padding: '12px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233' },
  tr: { transition: 'background-color 0.2s', backgroundColor: '#11131c' },
  btnRemove: { backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' },
  totalsArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #1f2233' },
  discountControls: { display: 'flex', gap: '10px' },
  btnAction: { backgroundColor: 'transparent', border: '1px solid #e2e8f0', color: '#e2e8f0', padding: '10px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnActionGreen: { backgroundColor: 'transparent', border: '1px solid #4ade80', color: '#4ade80', padding: '10px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnActionDanger: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  totalDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  totalLabel: { color: '#94a3b8', fontSize: '14px' },
  totalBig: { color: '#4ade80', fontSize: '24px', fontWeight: 'bold' },
  paymentActions: { display: 'flex', gap: '15px', marginTop: '20px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '600px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  btnSaveModal: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  modalProductList: { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' },
  modalProductItem: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  
  // ESTILOS DO COMPONENTE SELECT PESQUISÁVEL
  selectHeader: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxSizing: 'border-box' },
  selectDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#11131c', border: '1px solid #3b82f6', borderRadius: '4px', marginTop: '4px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.8)', overflow: 'hidden' },
  selectSearchContainer: { display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #1f2233', backgroundColor: '#0f111a' },
  selectSearchIcon: { marginRight: '8px' },
  selectSearchInput: { flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' },
  selectOptionsContainer: { maxHeight: '200px', overflowY: 'auto' },
  selectOption: { padding: '10px 12px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #1f2233', transition: 'background-color 0.2s' },
};

export default VendaForm;