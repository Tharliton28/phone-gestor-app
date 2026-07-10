import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Plus, Search, X, Trash2, 
  DollarSign, Percent, Eraser, CreditCard, Calculator, 
  AlertCircle, CheckCircle, Smartphone, Info
} from 'lucide-react';

const VendaForm = ({ aoVoltar }) => {
  // ==========================================
  // ESTADOS DO CARRINHO E VALORES GERAIS
  // ==========================================
  const [carrinho, setCarrinho] = useState([]);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  
  const [descontoGlobal, setDescontoGlobal] = useState(0);
  const [acrescimoGlobal, setAcrescimoGlobal] = useState(0); 
  const [statusVenda, setStatusVenda] = useState('Concluído');

  // ==========================================
  // ESTADOS DOS MODAIS PROFISSIONAIS
  // ==========================================
  const [modalDescontoAberto, setModalDescontoAberto] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState('rs'); 
  const [valorDescontoInput, setValorDescontoInput] = useState('');

  const [modalTrocoAberto, setModalTrocoAberto] = useState(false);
  const [valorEntregueTroco, setValorEntregueTroco] = useState('');

  const [modalExcluirPagamento, setModalExcluirPagamento] = useState({ aberto: false, id: null });
  
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });

  const [modalAparelhoAberto, setModalAparelhoAberto] = useState(false);
  const [aparelhoEntrada, setAparelhoEntrada] = useState({ modelo: '', imei: '', valor: '' });

  // ==========================================
  // ESTADOS DE PAGAMENTO
  // ==========================================
  const [pagamentos, setPagamentos] = useState([
    { id: Date.now(), forma: '', valor: '', parcelas: 'À vista', detalhes: '', taxa: 0, taxaRepassada: false }
  ]);

  const estoqueMock = [
    { id: '5181678', nome: 'iPhone 13 Pro Max - 128GB - AZUL PACÍFICO', imei: '353967815666840', preco: 4500.00, tipo: 'Aparelho' },
    { id: '9845123', nome: 'Capa MagSafe Transparente - iPhone 13 Pro Max', imei: null, preco: 150.00, tipo: 'Acessório' },
    { id: '7412589', nome: 'Película de Vidro 3D', imei: null, preco: 50.00, tipo: 'Acessório' },
    { id: '8523697', nome: 'Carregador Turbo 20W Original', imei: null, preco: 199.00, tipo: 'Acessório' },
    { id: 'AVULSO', nome: 'Produto Avulso (Fora do Estoque)', imei: null, preco: 0.00, tipo: 'Avulso' }
  ];

  const mostrarAviso = (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    setModalAviso({ aberto: true, titulo, mensagem, tipo, acaoOk });
  };

  // ==========================================
  // LÓGICA DO CARRINHO
  // ==========================================
  const adicionarAoCarrinho = (produto) => {
    const item = { ...produto, idCarrinho: Date.now(), quantidade: 1 };
    setCarrinho([...carrinho, item]);
    setModalProdutoAberto(false);
    setBuscaProduto('');
  };

  const removerDoCarrinho = (idCarrinho) => setCarrinho(carrinho.filter(i => i.idCarrinho !== idCarrinho));

  const atualizarItem = (idCarrinho, campo, valor) => {
    setCarrinho(carrinho.map(item => item.idCarrinho === idCarrinho ? { ...item, [campo]: Number(valor) || 0 } : item));
  };

  const subtotalItens = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  const totalGeral = Math.max(0, subtotalItens - descontoGlobal + acrescimoGlobal);

  const abrirModalDesconto = (tipo) => {
    setTipoDesconto(tipo);
    setValorDescontoInput('');
    setModalDescontoAberto(true);
  };

  const confirmarDesconto = () => {
    const valorNum = parseFloat(valorDescontoInput.replace(',', '.'));
    if (!isNaN(valorNum) && valorNum >= 0) {
      if (tipoDesconto === 'rs') setDescontoGlobal(valorNum);
      else setDescontoGlobal(subtotalItens * (valorNum / 100));
    }
    setModalDescontoAberto(false);
  };

  const removerDesconto = () => {
    setDescontoGlobal(0);
  };

  const limparValoresExtras = () => {
    setDescontoGlobal(0);
    setAcrescimoGlobal(0);
    setPagamentos(pagamentos.map(p => ({ ...p, taxaRepassada: false })));
  };

  // ==========================================
  // LÓGICA DE PAGAMENTOS E TAXAS
  // ==========================================
  const totalPago = pagamentos.reduce((acc, pag) => acc + (parseFloat(pag.valor) || 0), 0);
  const valorRestante = totalGeral - totalPago;
  const trocoCalculado = totalPago > totalGeral ? totalPago - totalGeral : 0;

  const adicionarLinhaPagamento = () => {
    const valorSugerido = valorRestante > 0 ? valorRestante.toFixed(2) : '';
    setPagamentos([...pagamentos, { id: Date.now(), forma: '', valor: valorSugerido, parcelas: 'À vista', detalhes: '', taxa: 0, taxaRepassada: false }]);
  };

  const mudarFormaPagamento = (id, novaForma) => {
    const match = novaForma.match(/Taxa: ([\d.]+)%/);
    const taxaExtraida = match ? parseFloat(match[1]) : 0;
    setPagamentos(pagamentos.map(pag => pag.id === id ? { ...pag, forma: novaForma, taxa: taxaExtraida, taxaRepassada: false } : pag));
  };

  const atualizarPagamento = (id, campo, valor) => {
    setPagamentos(pagamentos.map(pag => pag.id === id ? { ...pag, [campo]: valor } : pag));
  };

  const repassarTaxaAoCliente = (idPagamento, valorAtual, taxaPercentual) => {
    const baseCalculo = parseFloat(valorAtual);
    if (isNaN(baseCalculo) || baseCalculo <= 0) return mostrarAviso('Atenção', 'Informe um valor de pagamento válido.', 'erro');

    const valorTaxa = baseCalculo * (taxaPercentual / 100);
    setAcrescimoGlobal(prev => prev + valorTaxa);
    
    setPagamentos(pagamentos.map(pag => 
      pag.id === idPagamento ? { ...pag, valor: (baseCalculo + valorTaxa).toFixed(2), taxaRepassada: true } : pag
    ));
  };

  const removerTaxaAoCliente = (idPagamento, valorComTaxa, taxaPercentual) => {
    const baseCalculo = parseFloat(valorComTaxa) / (1 + (taxaPercentual / 100));
    const valorTaxa = parseFloat(valorComTaxa) - baseCalculo;
    
    setAcrescimoGlobal(prev => Math.max(0, prev - valorTaxa));
    
    setPagamentos(pagamentos.map(pag => 
      pag.id === idPagamento ? { ...pag, valor: baseCalculo.toFixed(2), taxaRepassada: false } : pag
    ));
  };

  // CORREÇÃO: Remove a taxa associada se a linha for deletada
  const confirmarRemocaoPagamento = () => {
    const pagToRemove = pagamentos.find(p => p.id === modalExcluirPagamento.id);
    
    if (pagToRemove && pagToRemove.taxaRepassada) {
      const baseCalculo = parseFloat(pagToRemove.valor) / (1 + (pagToRemove.taxa / 100));
      const valorTaxa = parseFloat(pagToRemove.valor) - baseCalculo;
      setAcrescimoGlobal(prev => Math.max(0, prev - valorTaxa));
    }

    setPagamentos(pagamentos.filter(pag => pag.id !== modalExcluirPagamento.id));
    setModalExcluirPagamento({ aberto: false, id: null });
  };

  const confirmarAparelhoEntrada = () => {
    const valorNum = parseFloat(aparelhoEntrada.valor.replace(',', '.'));
    if (!aparelhoEntrada.modelo || isNaN(valorNum) || valorNum <= 0) {
      return mostrarAviso('Atenção', 'Preencha o modelo e um valor de avaliação válido.', 'erro');
    }

    const detalhesStr = `${aparelhoEntrada.modelo} ${aparelhoEntrada.imei ? `(IMEI: ${aparelhoEntrada.imei})` : ''}`;

    setPagamentos([...pagamentos, { 
      id: Date.now(), 
      forma: 'Aparelho Usado (Entrada)', 
      valor: valorNum.toFixed(2), 
      parcelas: 'À vista', 
      detalhes: detalhesStr, 
      taxa: 0, 
      taxaRepassada: false 
    }]);

    setModalAparelhoAberto(false);
    
    mostrarAviso(
      'Aparelho Adicionado!', 
      `O ${aparelhoEntrada.modelo} foi lançado como forma de pagamento e inserido com sucesso no módulo de Estoque (Seminovos).`, 
      'sucesso'
    );
    
    setAparelhoEntrada({ modelo: '', imei: '', valor: '' });
  };

  const finalizarVenda = () => {
    if (carrinho.length === 0) return mostrarAviso('Atenção', 'Adicione produtos ao carrinho para vender.', 'erro');
    if (valorRestante > 0.05) return mostrarAviso('Pagamento Incompleto', 'O valor total ainda não foi totalmente pago.', 'erro');
    
    mostrarAviso('Sucesso!', 'A venda foi finalizada e salva no banco de dados com sucesso.', 'sucesso', () => aoVoltar());
  };

  useEffect(() => {
    if (carrinho.length === 0) {
      setPagamentos([{ id: Date.now(), forma: '', valor: '', parcelas: 'À vista', detalhes: '', taxa: 0, taxaRepassada: false }]);
      setDescontoGlobal(0);
      setAcrescimoGlobal(0);
    } else if (pagamentos.length === 1 && !pagamentos[0].valor && totalGeral > 0) {
      atualizarPagamento(pagamentos[0].id, 'valor', totalGeral.toFixed(2));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrinho.length, totalGeral]);

  const produtosFiltrados = estoqueMock.filter(p => 
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) || 
    (p.imei && p.imei.includes(buscaProduto))
  );

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>Nova Venda - PDV</h2>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={{...styles.btnSave, opacity: (valorRestante > 0.05 || carrinho.length === 0) ? 0.5 : 1}} 
            onClick={finalizarVenda}
          >
            <Save size={16} /> Finalizar Venda
          </button>
        </div>
      </div>

      <div style={styles.content}>
        
        {/* DADOS GERAIS */}
        <div style={styles.section}>
          <div style={styles.grid5}>
            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}>Cliente:</label>
              <select style={styles.input}>
                <option>Consumidor Final (Padrão)</option>
                <option>THAIS LOPES</option>
                <option>NATAN COVIDEIRA</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Vendedor:</label>
              <select style={styles.input}>
                <option>Wesley de Sousa Viana</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data da Venda:</label>
              <input style={styles.input} type="date" defaultValue="2026-07-10" />
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
                      <td style={{...styles.td, textAlign: 'right'}}>{item.preco.toFixed(2)}</td>
                      <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#4ade80'}}>{(item.preco * item.quantidade).toFixed(2)}</td>
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
              <span style={styles.totalLabel}>Subtotal: R$ {subtotalItens.toFixed(2)}</span>
              {descontoGlobal > 0 && <span style={{color: '#fbbf24', fontSize: '14px'}}>- Desconto: R$ {descontoGlobal.toFixed(2)}</span>}
              {acrescimoGlobal > 0 && <span style={{color: '#ef4444', fontSize: '14px'}}>+ Acréscimo/Taxas: R$ {acrescimoGlobal.toFixed(2)}</span>}
              <span style={styles.totalBig}>Total: R$ {totalGeral.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* DADOS DO PAGAMENTO CONDICIONAL */}
        <div style={styles.section}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3 style={styles.sectionTitle}>Dados do Pagamento</h3>
            {carrinho.length > 0 && (
              <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                {valorRestante > 0.01 ? (
                  <span style={{color: '#ef4444', fontWeight: 'bold', fontSize: '14px'}}>Falta pagar: R$ {valorRestante.toFixed(2)}</span>
                ) : trocoCalculado > 0.01 ? (
                  <span style={{color: '#4ade80', fontWeight: 'bold', fontSize: '14px'}}>Troco: R$ {trocoCalculado.toFixed(2)}</span>
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
              {pagamentos.map((pag, index) => (
                <div key={pag.id} style={{...styles.grid4, marginBottom: '15px', paddingBottom: '15px', borderBottom: index < pagamentos.length - 1 ? '1px dashed #2a2e3f' : 'none'}}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Forma de pagamento:</label>
                    <select style={styles.input} value={pag.forma} onChange={(e) => mudarFormaPagamento(pag.id, e.target.value)}>
                      <option value="">Selecionar...</option>
                      <option>PIX (Taxa: 0.00%)</option>
                      <option>Dinheiro (Taxa: 0.00%)</option>
                      <option>Crédito à Vista Stone (Taxa: 3.49%)</option>
                      <option>Crédito Parcelado 12x Stone (Taxa: 12.99%)</option>
                      <option>Débito PagSeguro (Taxa: 1.99%)</option>
                      <option>Aparelho Usado (Entrada)</option>
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Valor Pago (R$):</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <input style={{...styles.input, flex: 1}} type="number" value={pag.valor} onChange={(e) => atualizarPagamento(pag.id, 'valor', e.target.value)} />
                      
                      {pag.taxa > 0 && !pag.taxaRepassada && (
                        <button style={styles.btnRepassarTaxa} onClick={() => repassarTaxaAoCliente(pag.id, pag.valor, pag.taxa)}>
                          Repassar Taxa ({pag.taxa}%)
                        </button>
                      )}
                      {pag.taxaRepassada && (
                        <button style={styles.btnRemoverTaxa} onClick={() => removerTaxaAoCliente(pag.id, pag.valor, pag.taxa)}>
                          <X size={12}/> Remover Taxa
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Parcelas:</label>
                    <select style={styles.input} value={pag.parcelas} onChange={(e) => atualizarPagamento(pag.id, 'parcelas', e.target.value)}>
                      <option>À vista</option><option>2x</option><option>3x</option><option>10x</option><option>12x</option>
                    </select>
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
              ))}

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
                {produtosFiltrados.map(p => (
                  <div key={p.id} style={styles.modalProductItem} onClick={() => adicionarAoCarrinho(p)}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span style={{color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold'}}>{p.nome}</span>
                      <span style={{color: '#64748b', fontSize: '11px'}}>Cód: {p.id} {p.imei && `| IMEI: ${p.imei}`}</span>
                    </div>
                    <div style={{color: '#4ade80', fontWeight: 'bold'}}>R$ {p.preco.toFixed(2)}</div>
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
                <input style={styles.input} type="number" placeholder="0.00" value={aparelhoEntrada.valor} onChange={(e) => setAparelhoEntrada({...aparelhoEntrada, valor: e.target.value})} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalAparelhoAberto(false)}>Cancelar</button>
              <button style={styles.btnSaveModal} onClick={confirmarAparelhoEntrada}>Lançar e Adicionar ao Estoque</button>
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
              <input style={{...styles.input, width: '100%'}} type="number" value={valorDescontoInput} onChange={(e) => setValorDescontoInput(e.target.value)} autoFocus />
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
              <input style={{...styles.input, width: '100%', fontSize: '20px'}} type="number" value={valorEntregueTroco} onChange={(e) => setValorEntregueTroco(e.target.value)} autoFocus />
              {valorEntregueTroco > totalGeral && (
                <div style={{marginTop: '20px', padding: '15px', backgroundColor: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', textAlign: 'center'}}>
                  <span style={{color: '#4ade80', fontSize: '28px', fontWeight: 'bold'}}>R$ {(valorEntregueTroco - totalGeral).toFixed(2)}</span>
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
            <div style={styles.modalHeader}><h3 style={{color: '#fff'}}>Remover Pagamento?</h3></div>
            <div style={{padding: '20px 0', color: '#94a3b8'}}>Deseja remover esta forma de pagamento da venda? Os valores serão recalculados.</div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalExcluirPagamento({aberto: false})}>Não</button>
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
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none' },
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
  modalProductItem: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }
};

export default VendaForm;