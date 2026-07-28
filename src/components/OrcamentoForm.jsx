import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Plus, Trash2, 
  FileText, Package, Edit, Calculator, X, Printer, Phone, Smartphone,
  AlertCircle, CheckCircle, Info, Search
} from 'lucide-react';
import { parseMoney } from '../utils/formatters';

const OrcamentoForm = ({ aoVoltar, dadosNavegacao }) => {
  const orcamentoInicial = dadosNavegacao?.orcamentoSelecionado || null;
  const autoImprimir = dadosNavegacao?.autoImprimir || false;

  const [itens, setItems] = useState(
    orcamentoInicial ? [
      { id: '1', nome: 'Produto Referente ao Orçamento ' + orcamentoInicial.cod, preco: parseFloat(orcamentoInicial.valor.replace('.', '').replace(',', '.')), quantidade: 1, desconto: 0, idRow: Date.now() }
    ] : []
  );
  
  const [quantidade, setQuantidade] = useState(1);
  const [descontoItem, setDescontoItem] = useState('');

  // ESTADOS DE BUSCA COM AUTOCOMPLETE
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionadoObj, setClienteSelecionadoObj] = useState(null);
  const [mostrarClientes, setModalMostrarClientes] = useState(false);

  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionadoObj, setProdutoSelecionadoObj] = useState(null);
  const [mostrarProdutos, setModalMostrarProdutos] = useState(false);

  const refCliente = useRef(null);
  const refProduto = useRef(null);

  // ESTADOS DO SIMULADOR FINANCEIRO E DADOS GERAIS
  const [entrada, setEntrada] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix'); 
  const [parcelas, setParcelas] = useState(1);
  const [adicionarTaxa, setAdicionarTaxa] = useState(true);
  const [taxaVisivel, setTaxaVisivel] = useState(true);
  const [observacoes, setObservacoes] = useState('');

  const [aparelhosNaTroca, setAparelhosNaTroca] = useState([]);
  const [modalAparelhoAberto, setModalAparelhoAberto] = useState(false);
  const [aparelhoEntrada, setAparelhoEntrada] = useState({ modelo: '', imei: '', valor: '' });

  // ESTADOS DOS MODAIS
  const [modalCliente, setModalCliente] = useState({ aberto: false, modo: 'novo' });
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '' });
  const [modalPDF, setModalPDF] = useState(autoImprimir);
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });

  const [clientesMock, setClientesMock] = useState([
    { id: '1', nome: 'THAIS LOPES', telefone: '(85) 99430-0841' },
    { id: '2', nome: 'NATAN COVIDEIRA', telefone: '(85) 99999-8888' },
    { id: '3', nome: 'ANTONIA DEBORA FELIPE', telefone: '(85) 97777-6666' }
  ]);

  const estoqueMock = [
    { id: '1', nome: 'iPhone 13 Pro Max - 128GB - AZUL PACÍFICO', preco: 4500.00 },
    { id: '2', nome: 'Capa MagSafe Transparente', preco: 150.00 },
    { id: '3', nome: 'Película de Vidro 3D', preco: 50.00 },
    { id: '4', nome: 'Carregador Turbo 20W Original', preco: 199.00 },
  ];

  const taxasCredito = {
    1: 0.035, 2: 0.045, 3: 0.050, 4: 0.060, 5: 0.070, 6: 0.080,
    7: 0.090, 8: 0.100, 9: 0.110, 10: 0.120, 11: 0.130, 12: 0.150
  };

  // Fechar menus ao clicar fora
  useEffect(() => {
    const cliqueFora = (e) => {
      if (refCliente.current && !refCliente.current.contains(e.target)) setModalMostrarClientes(false);
      if (refProduto.current && !refProduto.current.contains(e.target)) setModalMostrarProdutos(false);
    };
    document.addEventListener('mousedown', cliqueFora);
    return () => document.removeEventListener('mousedown', cliqueFora);
  }, []);

  useEffect(() => {
    if (orcamentoInicial) {
      let cliente = clientesMock.find(c => c.nome === orcamentoInicial.cliente);
      if (!cliente) {
        cliente = { id: `MOCK_${Date.now()}`, nome: orcamentoInicial.cliente, telefone: 'Não informado' };
        setClientesMock(prev => [...prev, cliente]);
      }
      setClienteSelecionadoObj(cliente);
      setBuscaCliente(cliente.nome);
    }
  }, [orcamentoInicial]);

  const mostrarAviso = (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    setModalAviso({ aberto: true, titulo, mensagem, tipo, acaoOk });
  };

  const adicionarAoOrcamento = () => {
    if (!produtoSelecionadoObj) return mostrarAviso('Atenção', 'Selecione um produto utilizando a busca.', 'erro');
    
    const descontoVal = Number(descontoItem) || 0;
    const novoItem = { 
      ...produtoSelecionadoObj, 
      idRow: Date.now(), 
      quantidade: Number(quantidade),
      desconto: descontoVal
    };
    setItems([...itens, novoItem]);
    setProdutoSelecionadoObj(null);
    setBuscaProduto('');
    setQuantidade(1);
    setDescontoItem('');
  };

  const removerDoOrcamento = (idRow) => {
    setItems(itens.filter(i => i.idRow !== idRow));
  };

  const confirmarAparelhoEntrada = () => {
    const valorNum = parseMoney(aparelhoEntrada.valor);
    if (!aparelhoEntrada.modelo || isNaN(valorNum) || valorNum <= 0) {
      return mostrarAviso('Atenção', 'Preencha o modelo e um valor de avaliação válido.', 'erro');
    }
    setAparelhosNaTroca([...aparelhosNaTroca, { ...aparelhoEntrada, id: Date.now(), valor: valorNum }]);
    setModalAparelhoAberto(false);
    setAparelhoEntrada({ modelo: '', imei: '', valor: '' });
  };

  const removerAparelhoTroca = (id) => {
    setAparelhosNaTroca(aparelhosNaTroca.filter(a => a.id !== id));
  };

  const abrirModalEditarCliente = () => {
    if (!clienteSelecionadoObj) return mostrarAviso('Atenção', 'Selecione um cliente para editar.', 'erro');
    setNovoCliente({ nome: clienteSelecionadoObj.nome, telefone: clienteSelecionadoObj.telefone });
    setModalCliente({ aberto: true, modo: 'editar' });
  };

  const salvarCliente = () => {
    if (!novoCliente.nome) return mostrarAviso('Atenção', 'O nome é obrigatório.', 'erro');
    if (modalCliente.modo === 'novo') {
      const novo = { id: `C${Date.now()}`, nome: novoCliente.nome, telefone: novoCliente.telefone };
      setClientesMock([...clientesMock, novo]);
      setClienteSelecionadoObj(novo);
      setBuscaCliente(novo.nome);
    } else {
      const updated = { ...clienteSelecionadoObj, nome: novoCliente.nome, telefone: novoCliente.telefone };
      setClientesMock(clientesMock.map(c => c.id === clienteSelecionadoObj.id ? updated : c));
      setClienteSelecionadoObj(updated);
      setBuscaCliente(updated.nome);
    }
    setModalCliente({ aberto: false, modo: 'novo' });
    setNovoCliente({ nome: '', telefone: '' });
    mostrarAviso('Sucesso', 'Cliente salvo com sucesso!', 'sucesso');
  };

  const gerarPDF = () => {
    if (itens.length === 0) return mostrarAviso('Atenção', 'Adicione produtos para gerar o orçamento.', 'erro');
    if (!clienteSelecionadoObj) return mostrarAviso('Atenção', 'Selecione o cliente do orçamento.', 'erro');
    setModalPDF(true);
  };

  const fecharModalPDF = () => {
      setModalPDF(false);
      if(autoImprimir) aoVoltar();
  }

  // Filtragem dos Autocompletes
  const clientesFiltrados = clientesMock.filter(c => 
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const produtosFiltrados = estoqueMock.filter(p => 
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  // CÁLCULOS
  const subtotal = itens.reduce((acc, item) => acc + ((item.preco * item.quantidade) - item.desconto), 0);
  const valorEntradaDinheiro = Number(entrada) || 0;
  const valorTotalAparelhos = aparelhosNaTroca.reduce((acc, ap) => acc + ap.valor, 0);
  const valorRestante = Math.max(0, subtotal - valorEntradaDinheiro - valorTotalAparelhos);

  let taxaAplicada = 0;
  if (formaPagamento === 'credito') taxaAplicada = taxasCredito[parcelas];
  else if (formaPagamento === 'debito') taxaAplicada = 0.0199;

  const valorAcrescimo = valorRestRestante = valorRestante * taxaAplicada;
  const acrescimoReal = adicionarTaxa ? valorAcrescimo : 0;
  const totalFinal = subtotal + acrescimoReal;
  const valorDaParcela = (valorRestante + acrescimoReal) / parcelas;

  const getNomePagamento = () => {
    if(formaPagamento === 'pix') return 'Dinheiro / PIX';
    if(formaPagamento === 'debito') return 'Cartão de Débito';
    return `Cartão de Crédito em ${parcelas}x`;
  };

  return (
    <div style={styles.container} className="orcamento-container">
      
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>
             {orcamentoInicial ? `Editando Orçamento #${orcamentoInicial.cod}` : 'Novo Orçamento de Venda'}
          </h2>
        </div>
      </div>

      <div style={styles.content}>
        
        {/* DADOS GERAIS */}
        <div style={styles.section}>
          <div style={styles.grid4}>
            
            {/* SEARCH INPUT CLIENTE */}
            <div style={{...styles.inputGroup, gridColumn: 'span 2', position: 'relative'}} ref={refCliente}>
              <label style={styles.label}><span style={styles.required}>*</span> Cliente:</label>
              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{position: 'relative', flex: 1}}>
                  <input 
                    style={{...styles.input, paddingLeft: '35px'}} 
                    placeholder="Digitar nome para pesquisar cliente..." 
                    value={buscaCliente}
                    onChange={(e) => {
                      setBuscaCliente(e.target.value);
                      setClienteSelecionadoObj(null); 
                      setModalMostrarClientes(true);
                    }}
                    onFocus={() => setModalMostrarClientes(true)}
                  />
                  <Search size={14} color="#64748b" style={{position: 'absolute', left: '12px', top: '13px'}} />
                </div>
                <button style={styles.btnIcon} title="Editar Cliente" onClick={abrirModalEditarCliente}><Edit size={16}/></button>
                <button style={styles.btnIconSuccess} title="Novo Cliente" onClick={() => { setNovoCliente({nome: '', telefone: ''}); setModalCliente({aberto: true, modo: 'novo'}); }}><Plus size={16}/></button>
              </div>

              {/* LISTA FLUTUANTE DE CLIENTES */}
              {mostrarClientes && (
                <div style={styles.autocompleteDropdown}>
                  {clientesFiltrados.length === 0 ? (
                    <div style={styles.dropdownOptionVazia}>Nenhum cliente encontrado</div>
                  ) : (
                    clientesFiltrados.map(c => (
                      <div 
                        key={c.id} 
                        style={styles.dropdownOption}
                        onClick={() => {
                          setClienteSelecionadoObj(c);
                          setBuscaCliente(c.nome);
                          setModalMostrarClientes(false);
                        }}
                      >
                        {c.nome} <span style={{fontSize: '11px', color: '#64748b', marginLeft: '5px'}}>{c.telefone}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}><span style={styles.required}>*</span> Vendedor:</label>
              <select style={styles.input}>
                <option>{orcamentoInicial ? orcamentoInicial.vendedor : 'Wesley de Sousa Viana'}</option>
              </select>
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data do orçamento:</label>
              <input style={styles.input} type="datetime-local" defaultValue="2026-07-08T10:46" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Validade (Dias):</label>
              <input style={styles.input} type="number" defaultValue="15" />
            </div>
            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}>Previsão de Entrega/Retirada (Opcional):</label>
              <input style={styles.input} type="date" />
            </div>
            
            <div style={{...styles.inputGroup, gridColumn: 'span 4'}}>
              <label style={styles.label}>Observações / Condições Especiais:</label>
              <input 
                style={styles.input} 
                value={observacoes} 
                onChange={(e) => setObservacoes(e.target.value)} 
                placeholder="Ex: Orçamento sujeito a alteração do dólar. Aparelho sob encomenda." 
              />
            </div>
          </div>
        </div>

        {/* ITENS */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><Package size={16} /> Itens do Orçamento</h3>
          
          <div style={styles.addItemArea}>
            
            {/* SEARCH INPUT PRODUTO */}
            <div style={{...styles.inputGroup, flex: 3, position: 'relative'}} ref={refProduto}>
              <label style={styles.label}><span style={styles.required}>*</span> Seleziona o Produto:</label>
              <div style={{position: 'relative'}}>
                <input 
                  style={{...styles.input, paddingLeft: '35px'}} 
                  placeholder="Digitar nome para pesquisar no estoque..."
                  value={buscaProduto}
                  onChange={(e) => {
                    setBuscaProduto(e.target.value);
                    setProdutoSelecionadoObj(null);
                    setModalMostrarProdutos(true);
                  }}
                  onFocus={() => setModalMostrarProdutos(true)}
                />
                <Search size={14} color="#64748b" style={{position: 'absolute', left: '12px', top: '13px'}} />
              </div>

              {/* LISTA FLUTUANTE DE PRODUTOS */}
              {mostrarProdutos && (
                <div style={styles.autocompleteDropdown}>
                  {produtosFiltrados.length === 0 ? (
                    <div style={styles.dropdownOptionVazia}>Nenhum produto em estoque</div>
                  ) : (
                    produtosFiltrados.map(p => (
                      <div 
                        key={p.id} 
                        style={styles.dropdownOption}
                        onClick={() => {
                          setProdutoSelecionadoObj(p);
                          setBuscaProduto(p.nome);
                          setModalMostrarProdutos(false);
                        }}
                      >
                        {p.nome} - <span style={{fontWeight: 'bold', color: '#4ade80'}}>R$ {p.preco.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{...styles.inputGroup, flex: 1}}>
              <label style={styles.label}><span style={styles.required}>*</span> Qtd:</label>
              <input style={styles.input} type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div style={{...styles.inputGroup, flex: 1}}>
              <label style={styles.label}>Desconto (R$):</label>
              <input style={styles.input} type="number" min="0" step="0.01" placeholder="0.00" value={descontoItem} onChange={(e) => setDescontoItem(e.target.value)} />
            </div>

            <div style={{display: 'flex', alignItems: 'flex-end'}}>
              <button style={styles.btnAddItem} onClick={adicionarAoOrcamento}>
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: '45%'}}>Descrição do Produto</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Qtd.</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Valor Un. (R$)</th>
                  <th style={{...styles.th, textAlign: 'right', color: '#fbbf24'}}>Desc. (R$)</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Total (R$)</th>
                  <th style={{...styles.th, textAlign: 'center', width: '60px'}}></th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr><td colSpan="6" style={{padding: '30px', textAlign: 'center', color: '#64748b'}}>Nenhum produto adicionado ao orçamento.</td></tr>
                ) : (
                  itens.map((item) => (
                    <tr key={item.idRow} style={styles.tr}>
                      <td style={{...styles.td, color: '#e2e8f0', fontWeight: 'bold'}}>{item.nome}</td>
                      <td style={{...styles.td, textAlign: 'center'}}>{item.quantidade}</td>
                      <td style={{...styles.td, textAlign: 'right'}}>{item.preco.toFixed(2)}</td>
                      <td style={{...styles.td, textAlign: 'right', color: '#fbbf24'}}>{item.desconto > 0 ? `- ${item.desconto.toFixed(2)}` : '0.00'}</td>
                      <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#4ade80'}}>
                        {((item.preco * item.quantidade) - item.desconto).toFixed(2)}
                      </td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <button style={styles.btnRemove} onClick={() => removerDoOrcamento(item.idRow)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* SIMULADOR FINANCEIRO */}
          {itens.length > 0 && (
            <div style={styles.summaryContainer}>
              <div style={styles.summaryBox}>
                <h4 style={styles.summaryTitle}><Calculator size={16}/> Resumo Financeiro & Simulação</h4>
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Subtotal c/ descontos:</span>
                  <span style={styles.summaryValue}>R$ {subtotal.toFixed(2)}</span>
                </div>
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Entrada em Dinheiro (R$):</span>
                  <input style={{...styles.input, width: '120px', padding: '6px 10px', textAlign: 'right'}} type="number" placeholder="0.00" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
                </div>

                <div style={{marginTop: '10px', marginBottom: '15px'}}>
                  {aparelhosNaTroca.map(ap => (
                    <div key={ap.id} style={styles.tradeInItem}>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={{color: '#93c5fd', fontSize: '12px', fontWeight: 'bold'}}>{ap.modelo}</span>
                        <span style={{color: '#64748b', fontSize: '11px'}}>Avaliação: R$ {ap.valor.toFixed(2)}</span>
                      </div>
                      <button style={styles.btnRemove} onClick={() => removerAparelhoTroca(ap.id)}><X size={14}/></button>
                    </div>
                  ))}
                  <button style={styles.btnTradeIn} onClick={() => setModalAparelhoAberto(true)}>
                    <Smartphone size={14}/> + Simulador de Aparelho na Troca
                  </button>
                </div>

                {(valorEntradaDinheiro > 0 || valorTotalAparelhos > 0) && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Restante a pagar:</span>
                    <span style={{...styles.summaryValue, color: '#93c5fd'}}>R$ {valorRestante.toFixed(2)}</span>
                  </div>
                )}
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Pagamento do Restante:</span>
                  <select style={styles.selectSmall} value={formaPagamento} onChange={(e) => { setFormaPagamento(e.target.value); if(e.target.value !== 'credito') setParcelas(1); }}>
                    <option value="pix">Dinheiro / Pix</option>
                    <option value="debito">Cartão de Débito</option>
                    <option value="credito">Cartão de Crédito</option>
                  </select>
                </div>

                {formaPagamento === 'credito' && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Parcelamento:</span>
                    <select style={styles.selectSmall} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(p => <option key={p} value={p}>{p}x - Juros: {(taxasCredito[p] * 100).toFixed(1)}%</option>)}
                    </select>
                  </div>
                )}

                {formaPagamento !== 'pix' && valorAcrescimo > 0 && (
                  <div style={styles.taxControlsBox}>
                    <label style={styles.checkboxLabel}>
                      <input type="checkbox" checked={adicionarTaxa} onChange={(e) => setAdicionarTaxa(e.target.checked)} />
                      Adicionar Taxa ao Orçamento?
                    </label>
                    {adicionarTaxa && (
                      <label style={styles.checkboxLabel}>
                        <input type="checkbox" checked={taxaVisivel} onChange={(e) => setTaxaVisivel(e.target.checked)} />
                        Deixar taxa visível no PDF?
                      </label>
                    )}
                  </div>
                )}

                {adicionarTaxa && valorAcrescimo > 0 && (
                  <div style={styles.summaryRow}>
                    <span style={{...styles.summaryLabel, color: '#ef4444'}}>Acréscimo do Cartão:</span>
                    <span style={{...styles.summaryValue, color: '#ef4444'}}>
                      + R$ {valorAcrescimo.toFixed(2)}
                      {!taxaVisivel && <span style={{fontSize: '10px', display: 'block', fontWeight: 'normal'}}>(Oculto no PDF)</span>}
                    </span>
                  </div>
                )}

                <div style={styles.summaryTotalRow}>
                  <span style={styles.summaryTotalLabel}>Total do Orçamento:</span>
                  <span style={styles.summaryTotalValue}>R$ {totalFinal.toFixed(2)}</span>
                </div>

                {formaPagamento === 'credito' && parcelas > 1 && (
                  <div style={{textAlign: 'right', marginTop: '8px', color: '#94a3b8', fontSize: '13px'}}>
                    {valorEntradaDinheiro > 0 && <span>Entrada de R$ {valorEntradaDinheiro.toFixed(2)} + <br/></span>}
                    {valorTotalAparelhos > 0 && <span>Aparelho na Troca R$ {valorTotalAparelhos.toFixed(2)} + <br/></span>}
                    <strong style={{color: '#fff'}}>{parcelas}x de R$ {valorDaParcela.toFixed(2)}</strong>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>

      <div style={styles.footer} className="no-print">
        <div style={styles.totalArea}>
          <span style={styles.totalLabel}>Total Final do Orçamento:</span>
          <span style={styles.totalValue}>R$ {totalFinal.toFixed(2)}</span>
        </div>
        <div style={styles.footerActions}>
          <button style={styles.btnOutlineBlue} onClick={gerarPDF}>
            <FileText size={16} /> Salvar e Gerar PDF
          </button>
          <button style={styles.btnSaveGreen} onClick={() => mostrarAviso('Sucesso!', 'O Orçamento foi salvo com sucesso.', 'sucesso', () => aoVoltar())}>
            <Save size={16} /> Salvar Orçamento
          </button>
        </div>
      </div>

      {/* ================= MODAIS ================= */}

      {/* MODAL DE AVISO CUSTOMIZADO */}
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
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5'}}>{modalAviso.mensagem}</p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.btnSaveGreen, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6', width: '100%'}} 
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

      {/* MODAL: NOVO/EDITAR CLIENTE */}
      {modalCliente.aberto && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalContentSmall}>
            <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2233', paddingBottom: '10px', marginBottom: '15px'}}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px'}}>
                {modalCliente.modo === 'novo' ? 'Cadastrar Novo Cliente' : 'Editar Cliente'}
              </h3>
              <button style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}} onClick={() => setModalCliente({aberto: false, modo: 'novo'})}><X size={18}/></button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome Completo:</label>
                <input style={styles.input} placeholder="Nome do Cliente" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>WhatsApp / Telefone:</label>
                <input style={styles.input} placeholder="(00) 00000-0000" value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
              <button style={styles.btnDangerOutline} onClick={() => setModalCliente({aberto: false, modo: 'novo'})}>Cancelar</button>
              <button style={styles.btnSaveGreen} onClick={salvarCliente}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APARELHO NA TROCA */}
      {modalAparelhoAberto && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px'}}>Simular Aparelho na Troca</h3>
              <button style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}} onClick={() => setModalAparelhoAberto(false)}><X size={20} /></button>
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
                <input style={styles.input} type="number" placeholder="0.00" value={aparelhoEntrada.valor} onChange={(e) => setAparelhoEntrada({...aparelhoEntrada, valor: e.target.value})} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnDangerOutline} onClick={() => setModalAparelhoAberto(false)}>Cancelar</button>
              <button style={{...styles.btnSaveGreen, backgroundColor: '#3b82f6'}} onClick={confirmarAparelhoEntrada}>Adicionar ao Orçamento</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAÇÃO A4 PDF */}
      {modalPDF && (
        <div style={styles.modalOverlayPdf} className="modal-pdf-overlay">
          <div style={styles.pdfHeaderActions} className="no-print">
            <button style={styles.btnOutlinePdf} onClick={fecharModalPDF}><ArrowLeft size={16}/> Voltar</button>
            <div style={{display: 'flex', gap: '10px'}}>
              <button style={styles.btnPrimary} onClick={() => window.print()}><Printer size={16}/> Imprimir Orçamento</button>
              <button style={styles.btnWhatsappPdf}><Phone size={16}/> Enviar WhatsApp</button>
            </div>
          </div>
          
          {/* FOLHA A4 */}
          <div style={styles.a4Sheet} className="print-area">
            <div style={styles.pdfHeader}>
              <div>
                <h1 style={{margin: '0 0 5px 0', fontSize: '24px', color: '#111827'}}>BISCOITO IMPORTS LTDA</h1>
                <p style={{margin: 0, color: '#4b5563', fontSize: '13px'}}>CNPJ: 64.951.713/0001-13<br/>Avenida Narciso Pessoa de Araújo, 113<br/>Telefone: (85) 98589-2506</p>
              </div>
              <div style={{textAlign: 'right'}}>
                <h2 style={{margin: '0 0 5px 0', fontSize: '20px', color: '#3b82f6'}}>ORÇAMENTO #{orcamentoInicial ? orcamentoInicial.cod : '9005'}</h2>
                <p style={{margin: 0, color: '#4b5563', fontSize: '13px'}}>Data: {orcamentoInicial ? orcamentoInicial.data : '08/07/2026'}<br/>Validade: {orcamentoInicial ? orcamentoInicial.validade : '15 Dias'}</p>
              </div>
            </div>

            <div style={styles.pdfClientInfo}>
              <strong>Cliente:</strong> {clienteSelecionadoObj?.nome || 'Não informado'} <br/>
              <strong>Telefone:</strong> {clienteSelecionadoObj?.telefone || 'Não informado'} <br/>
              <strong>Vendedor:</strong> {orcamentoInicial ? orcamentoInicial.vendedor : 'Wesley de Sousa Viana'}
            </div>

            <table style={styles.pdfTable}>
              <thead>
                <tr>
                  <th style={styles.pdfTh}>Descrição</th>
                  <th style={{...styles.pdfTh, textAlign: 'center'}}>Qtd</th>
                  <th style={{...styles.pdfTh, textAlign: 'right'}}>V. Unit.</th>
                  <th style={{...styles.pdfTh, textAlign: 'right'}}>Desc.</th>
                  <th style={{...styles.pdfTh, textAlign: 'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={idx}>
                    <td style={styles.pdfTd}>{item.nome}</td>
                    <td style={{...styles.pdfTd, textAlign: 'center'}}>{item.quantidade}</td>
                    <td style={{...styles.pdfTd, textAlign: 'right'}}>R$ {item.preco.toFixed(2)}</td>
                    <td style={{...styles.pdfTd, textAlign: 'right'}}>{item.desconto > 0 ? `- R$ ${item.desconto.toFixed(2)}` : '-'}</td>
                    <td style={{...styles.pdfTd, textAlign: 'right', fontWeight: 'bold'}}>R$ {((item.preco * item.quantidade) - item.desconto).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.pdfSummary}>
              <div style={styles.pdfSummaryRow}>
                <span>Subtotal dos Produtos:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              {aparelhosNaTroca.map(ap => (
                <div style={styles.pdfSummaryRow} key={ap.id}>
                  <span>Aparelho na Troca ({ap.modelo}):</span>
                  <span style={{color: '#059669'}}>- R$ {ap.valor.toFixed(2)}</span>
                </div>
              ))}

              {valorEntradaDinheiro > 0 && (
                <div style={styles.pdfSummaryRow}>
                  <span>Valor de Entrada (Sinal):</span>
                  <span style={{color: '#059669'}}>- R$ {valorEntradaDinheiro.toFixed(2)}</span>
                </div>
              )}

              {adicionarTaxa && acrescimoReal > 0 && taxaVisivel && (
                <div style={styles.pdfSummaryRow}>
                  <span>Acréscimo ({getNomePagamento()}):</span>
                  <span style={{color: '#dc2626'}}>+ R$ {acrescimoReal.toFixed(2)}</span>
                </div>
              )}

              <div style={styles.pdfTotalRow}>
                <span>TOTAL DO ORÇAMENTO:</span>
                <span>R$ {totalFinal.toFixed(2)}</span>
              </div>

              {formaPagamento === 'credito' && parcelas > 1 && (
                <div style={{marginTop: '10px', fontSize: '14px', color: '#374151'}}>
                  Condição simulada: Restante parcelado em <strong>{parcelas}x de R$ {valorDaParcela.toFixed(2)}</strong> no cartão de crédito.
                </div>
              )}
            </div>

            <div style={styles.pdfFooterNotes}>
              <p><strong>Observações / Condições:</strong></p>
              <p>
                 {observacoes ? (
                   <span>{observacoes}</span>
                 ) : (
                   <>
                     1. Este orçamento tem validade de 15 dias corridos.<br/>
                     2. Valores sujeitos a alteração caso o pagamento seja feito de forma diferente da simulada acima.<br/>
                     3. Produtos sujeitos à disponibilidade em estoque.
                   </>
                 )}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          
          /* Esconde totalmente a Sidebar e a Topbar */
          #root > div > :not(main) { display: none !important; }
          main > :not(div) { display: none !important; }
          
          /* Esconde qualquer tela irmã do formulário de orçamento no main */
          main > div > :not(.orcamento-container) { display: none !important; }
          
          /* Dentro do formulário, oculta TUDO (menus, formulários, botões) e deixa só o Modal do PDF */
          .orcamento-container > :not(.modal-pdf-overlay) { display: none !important; }
          
          /* Oculta os botões internos do modal do PDF */
          .no-print { display: none !important; }

          /* CORREÇÃO DO ENCOLHIMENTO: Força toda a árvore de elementos a perder as regras flex do tema */
          html, body, #root, #root > div, main, main > div, .orcamento-container {
            background-color: #ffffff !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }

          /* Desenrola o Modal de visualização para virar um bloco comum na folha */
          .modal-pdf-overlay {
            position: static !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
          }

          /* Alinha a folha de orçamento perfeitamente no fluxo A4 do papel */
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            height: auto !important;
            min-height: 0 !important;
            display: block !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0f111a', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '85vh', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#11131c', padding: '20px 24px', borderBottom: '1px solid #1f2233', borderRadius: '8px 8px 0 0' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  content: { padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px' },
  section: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  sectionTitle: { color: '#e2e8f0', fontSize: '15px', margin: '0 0 15px 0', borderBottom: '1px solid #1f2233', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none' },
  btnIcon: { backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', width: '38px', height: '38px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  btnIconSuccess: { backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', color: '#4ade80', width: '38px', height: '38px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  addItemArea: { display: 'flex', gap: '15px', alignItems: 'flex-end', backgroundColor: '#0f111a', padding: '15px', borderRadius: '8px', border: '1px solid #1f2233', marginBottom: '20px' },
  btnAddItem: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', height: '38px' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #1f2233', borderRadius: '6px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', backgroundColor: '#0f111a' },
  td: { padding: '12px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  btnRemove: { backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' },
  summaryContainer: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
  summaryBox: { width: '400px', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '8px', padding: '20px' },
  summaryTitle: { margin: '0 0 20px 0', color: '#e2e8f0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1f2233', paddingBottom: '10px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  summaryLabel: { color: '#94a3b8', fontSize: '13px' },
  summaryValue: { color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' },
  selectSmall: { backgroundColor: '#161925', border: '1px solid #2a2e3f', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px', outline: 'none', width: '180px' },
  taxControlsBox: { backgroundColor: '#11131c', border: '1px dashed #2a2e3f', padding: '10px', borderRadius: '6px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' },
  summaryTotalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #1f2233' },
  summaryTotalLabel: { color: '#fff', fontSize: '16px', fontWeight: 'bold' },
  summaryTotalValue: { color: '#4ade80', fontSize: '22px', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#11131c', borderTop: '1px solid #1f2233', padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 8px 8px', zIndex: 10 },
  totalArea: { display: 'flex', alignItems: 'center', gap: '15px' },
  totalLabel: { color: '#94a3b8', fontSize: '16px' },
  totalValue: { color: '#38bdf8', fontSize: '28px', fontWeight: 'bold' },
  footerActions: { display: 'flex', gap: '15px' },
  btnOutlineBlue: { backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnSaveGreen: { backgroundColor: '#22c55e', color: '#0f111a', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  btnTradeIn: { backgroundColor: 'transparent', border: '1px dashed #38bdf8', color: '#38bdf8', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', width: '100%', justifyContent: 'center' },
  tradeInItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161925', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #2a2e3f' },

  /* MODAL CUSTOMIZADO GERAL */
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnDangerOutline: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' },
  
  /* DROPDOWN FLUTUANTE DO AUTOCOMPLETE */
  autocompleteDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto', zIndex: 9999, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  dropdownOption: { padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #1f2233', transition: 'background-color 0.2s' },
  dropdownOptionVazia: { padding: '12px 14px', color: '#64748b', fontSize: '13px', textAlign: 'center' },

  /* MODAL PDF (A4) */
  modalOverlayPdf: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 17, 26, 0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflowY: 'auto' },
  pdfHeaderActions: { width: '800px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  btnOutlinePdf: { backgroundColor: '#1f2233', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnWhatsappPdf: { backgroundColor: '#22c55e', color: '#0f111a', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' },
  
  a4Sheet: { width: '800px', minHeight: '1131px', backgroundColor: '#ffffff', color: '#111827', padding: '50px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'Arial, sans-serif' },
  pdfHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' },
  pdfClientInfo: { backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' },
  pdfTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '30px' },
  pdfTh: { borderBottom: '2px solid #d1d5db', padding: '10px 5px', textAlign: 'left', color: '#374151', fontSize: '13px', textTransform: 'uppercase' },
  pdfTd: { borderBottom: '1px solid #e5e7eb', padding: '12px 5px', fontSize: '14px', color: '#111827' },
  pdfSummary: { width: '350px', marginLeft: 'auto', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' },
  pdfSummaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#4b5563' },
  pdfTotalRow: { display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #d1d5db', fontSize: '18px', fontWeight: 'bold', color: '#111827' },
  pdfFooterNotes: { marginTop: '50px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }
};

export default OrcamentoForm;