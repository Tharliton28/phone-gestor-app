import React, { useState } from 'react';
import { 
  Building, ShoppingCart, Package, DollarSign, FileText, 
  BarChart2, Save, UploadCloud, ToggleRight, ToggleLeft,
  Plus, X, Edit, Trash2, CreditCard, Printer, Eye, EyeOff
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

// --- COMPONENTE REUTILIZÁVEL PARA GERENCIAR LISTAS (TAGS) ---
const GerenciadorLista = ({ titulo, descricao, itens, aoAdicionar, aoRemover, placeholder }) => {
  const [novoValor, setNovoValor] = useState('');

  const handleAdd = () => {
    if (novoValor.trim()) {
      aoAdicionar(novoValor);
      setNovoValor('');
    }
  };

  return (
    <div style={styles.listManagerCard}>
      <div style={styles.listManagerHeader}>
        <h4 style={styles.listManagerTitle}>{titulo}</h4>
        <p style={styles.listManagerDesc}>{descricao}</p>
      </div>
      <div style={styles.listManagerInputArea}>
        <input
          style={styles.listManagerInput}
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button style={styles.listManagerBtnAdd} onClick={handleAdd}>
          <Plus size={14} /> Adicionar
        </button>
      </div>
      <div style={styles.listManagerTags}>
        {itens.map((item, index) => (
          <span key={index} style={styles.tag}>
            {item}
            <button style={styles.tagBtnRemove} onClick={() => aoRemover(index)}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DE CONFIGURAÇÕES ---
const Configuracoes = () => {
  const { alert, confirm } = useDialog();
  const [abaAtiva, setAbaAtiva] = useState('empresa');
  
  const [toggles, setToggles] = useState({
    vendaSemEstoque: false,
    alertaEstoque: true,
    jurosAuto: true,
    resumoEmail: true
  });

  const [formasPagamento, setFormasPagamento] = useState([
    { id: 1, nome: 'PIX', tipo: 'PIX', taxa: '0.00', prazo: 'Imediato', ativo: true },
    { id: 2, nome: 'Dinheiro', tipo: 'Dinheiro', taxa: '0.00', prazo: 'Imediato', ativo: true },
    { id: 3, nome: 'Crédito à Vista (Stone)', tipo: 'Crédito', taxa: '3.49', prazo: '1 dia (D+1)', ativo: true },
    { id: 4, nome: 'Crédito Parcelado 12x (Stone)', tipo: 'Crédito', taxa: '12.99', prazo: '1 dia (D+1)', ativo: true },
    { id: 5, nome: 'Débito (PagSeguro)', tipo: 'Débito', taxa: '1.99', prazo: 'Na hora', ativo: true },
    { id: 6, nome: 'Boleto Bancário (Cora)', tipo: 'Boleto', taxa: '2.50', prazo: 'D+2 após pago', ativo: true },
  ]);

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [formDataPagamento, setFormDataPagamento] = useState({ id: null, nome: '', tipo: 'Crédito', taxa: '', prazo: 'Imediato', ativo: true });

  // === ESTADOS DOS DOCUMENTOS ===
  const [termoGarantia, setTermoGarantia] = useState(`TERMO DE GARANTIA E CONDIÇÕES DE COMPRA\n\nCláusula 1ª: O comprador [NOME_CLIENTE], inscrito sob o CPF [CPF_CLIENTE], está adquirindo o produto descrito acima em plenas condições de uso, mediante valor e forma de pagamento ajustados com a empresa [NOME_EMPRESA].\n\nCláusula 2ª: Por tratar-se de um aparelho seminovo, todas as informações foram repassadas pelo vendedor [NOME_VENDEDOR] na data [DATA_VENDA].\n\nCláusula 3ª (DO PRAZO): A garantia será de 90 dias para defeitos de fabricação (placa), contados a partir da data de recebimento do produto. A [NOME_EMPRESA] não garante a vedação contra água do aparelho.\n\nCláusula 4ª (PERDA DE GARANTIA): A garantia cessará imediatamente em caso de danos físicos, contato com líquidos, ou rompimento do selo de garantia.`);
  const [termoOS, setTermoOS] = useState(`Cláusula 1ª: Autorizo a [NOME_EMPRESA] a realizar o diagnóstico do equipamento descrito nesta OS.\n\nCláusula 2ª: A loja não se responsabiliza por dados perdidos (fotos, contatos). É dever do cliente [NOME_CLIENTE] realizar backup prévio.`);
  
  const [previewGarantia, setPreviewGarantia] = useState(false);
  const [previewOS, setPreviewOS] = useState(false);

  const abrirModalPagamento = (forma = null) => {
    if (forma) {
      setFormDataPagamento(forma); 
    } else {
      setFormDataPagamento({ id: null, nome: '', tipo: 'Crédito', taxa: '', prazo: 'Imediato', ativo: true }); 
    }
    setModalPagamentoAberto(true);
  };

  const salvarPagamento = async () => {
    if (!formDataPagamento.nome || !formDataPagamento.taxa) {
      await alert('Preencha o nome e a taxa da forma de pagamento.', { type: 'warning', title: 'Campos obrigatórios' });
      return;
    }

    if (formDataPagamento.id) {
      setFormasPagamento(formasPagamento.map(f => f.id === formDataPagamento.id ? formDataPagamento : f));
    } else {
      setFormasPagamento([...formasPagamento, { ...formDataPagamento, id: Date.now() }]);
    }
    setModalPagamentoAberto(false);
  };

  const removerPagamento = async (id) => {
    const confirmar = await confirm('Tem certeza que deseja remover esta forma de pagamento?', {
      title: 'Remover forma de pagamento',
    });
    if (confirmar) {
      setFormasPagamento(formasPagamento.filter(f => f.id !== id));
    }
  };

  const [listas, setListas] = useState({
    tiposVenda: ['Presencial', 'WhatsApp', 'Instagram', 'Site / E-commerce'],
    tiposEntrega: ['Retirada na Loja', 'Motoboy', 'Correios (PAC/Sedex)', 'Excursão / Ônibus'],
    catAparelhos: ['Smartphone', 'Tablet', 'Smartwatch', 'Notebook'],
    marcas: ['Apple', 'Samsung', 'Motorola', 'Xiaomi'],
    capacidades: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'],
    cores: ['Preto', 'Branco', 'Azul Sierra', 'Ouro', 'Prata'],
    disponibilidade: ['Disponível para venda', 'Uso Interno', 'Aguardando Conserto'],
    qualidadePecas: ['Original Nacional / Retirada', 'Premium (Incell / OLED)', 'Primeira Linha (AAA)', 'Paralela'],
    planoContas: ['Venda de Produto', 'Manutenção / Serviço', 'Compra de Estoque', 'Despesas Operacionais (Luz, Água, Aluguel)']
  });

  const handleToggle = (chave) => setToggles(prev => ({ ...prev, [chave]: !prev[chave] }));

  const adicionarItem = (chave, novoItem) => {
    setListas(prev => ({ ...prev, [chave]: [...prev[chave], novoItem] }));
  };

  const removerItem = (chave, index) => {
    setListas(prev => ({ ...prev, [chave]: prev[chave].filter((_, i) => i !== index) }));
  };

  // Função para transformar as tags em dados reais no preview
  const gerarPreview = (texto) => {
    if (!texto) return '';
    return texto
      .replace(/\[NOME_EMPRESA\]/g, 'Biscoito Imports LTDA')
      .replace(/\[CNPJ_EMPRESA\]/g, '64.951.713/0001-13')
      .replace(/\[NOME_CLIENTE\]/g, 'João da Silva')
      .replace(/\[CPF_CLIENTE\]/g, '123.456.789-00')
      .replace(/\[DATA_VENDA\]/g, '14/07/2026')
      .replace(/\[NOME_VENDEDOR\]/g, 'Wesley de Sousa')
      .replace(/\[PRAZO_GARANTIA\]/g, '90 dias')
      .replace(/\[NUMERO_RECIBO\]/g, 'MP0004146187');
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
        <button style={styles.btnSave} onClick={() => alert('Configurações salvas com sucesso!', { type: 'success', title: 'Sucesso' })}>
          <Save size={16} /> Salvar Alterações
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
              <h3 style={styles.sectionTitle}>Informações Básicas</h3>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Nome da Empresa (Razão Social):</label>
                  <input style={styles.input} defaultValue="Biscoito imports LTDA" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Regime Tributário:</label>
                  <select style={styles.input}>
                    <option>Simples Nacional</option>
                    <option>Lucro Presumido</option>
                    <option>Lucro Real</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>CNPJ:</label>
                  <input style={styles.input} defaultValue="64.951.713/0001-13" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Inscrição Estadual (IE):</label>
                  <input style={styles.input} placeholder="Isento ou Número da IE" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Inscrição Municipal:</label>
                  <input style={styles.input} placeholder="Número da IM" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>E-mail de Contato:</label>
                  <input style={styles.input} defaultValue="wesleydesousaviana007@gmail.com" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Telefone / WhatsApp:</label>
                  <input style={styles.input} defaultValue="85985892506" />
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Endereço</h3>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>CEP:</label>
                  <input style={styles.input} defaultValue="61.900-540" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rua / Logradouro:</label>
                  <input style={styles.input} defaultValue="Avenida Narciso Pessoa de Araújo" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Número:</label>
                  <input style={styles.input} defaultValue="113" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Complemento:</label>
                  <input style={styles.input} placeholder="Sala, Loja, Apartamento..." />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Bairro:</label>
                  <input style={styles.input} defaultValue="Jereissati I" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Cidade:</label>
                  <select style={styles.input}>
                    <option>2307650 - Maracanaú - CE</option>
                  </select>
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Contabilidade e Imagem</h3>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>CPF/CNPJ do Contador:</label>
                  <input style={styles.input} placeholder="Dados da Contabilidade" />
                </div>
              </div>

              {/* Informação do tamanho ideal da imagem */}
              <div style={{...styles.logoUploadArea, marginTop: '20px'}}>
                <div style={styles.logoPlaceholder}>LOGO</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', flex: 1}}>
                  <span style={{color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold'}}>Logotipo da Empresa</span>
                  <span style={{color: '#94a3b8', fontSize: '12px'}}>
                    Usado no cabeçalho de recibos, orçamentos e relatórios em PDF.
                    Para garantir que a imagem não quebre o layout do documento, o tamanho ideal e obrigatório é de <strong>500x500 pixels (Formato Quadrado)</strong>. Formatos aceitos: PNG (preferencialmente com fundo transparente) ou JPG. Tamanho máximo: 2MB.
                  </span>
                  <button style={styles.btnUpload}><UploadCloud size={14} /> Enviar nova imagem (500x500px)</button>
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
                  <h4 style={styles.toggleTitle}>Permitir Venda Sem Estoque (Ruptura)</h4>
                  <p style={styles.toggleDesc}>Se ativado, permite concluir uma venda mesmo se o saldo do produto estiver zerado.</p>
                </div>
                <Switch ativo={toggles.vendaSemEstoque} onClick={() => handleToggle('vendaSemEstoque')} />
              </div>

              <div style={styles.grid2}>
                <GerenciadorLista 
                  titulo="Tipos de Venda" 
                  descricao="Canais de onde as vendas se originam."
                  placeholder="Ex: Balcão, Mercado Livre..."
                  itens={listas.tiposVenda}
                  aoAdicionar={(item) => adicionarItem('tiposVenda', item)}
                  aoRemover={(index) => removerItem('tiposVenda', index)}
                />
                <GerenciadorLista 
                  titulo="Tipos de Entrega / Logística" 
                  descricao="Formas de envio disponíveis para o cliente."
                  placeholder="Ex: Transportadora Azul..."
                  itens={listas.tiposEntrega}
                  aoAdicionar={(item) => adicionarItem('tiposEntrega', item)}
                  aoRemover={(index) => removerItem('tiposEntrega', index)}
                />
              </div>
            </div>
          )}

          {/* --- ESTOQUE E PRODUTOS --- */}
          {abaAtiva === 'estoque' && (
            <div style={{...styles.formSection, maxWidth: '100%'}}>
              <h3 style={styles.sectionTitle}>Atributos de Produtos e Estoque</h3>
              
              <div style={styles.grid2}>
                <GerenciadorLista 
                  titulo="Categorias de Aparelhos" 
                  descricao="Ex: Smartphones, Tablets, Consoles..."
                  placeholder="Nova categoria..."
                  itens={listas.catAparelhos}
                  aoAdicionar={(item) => adicionarItem('catAparelhos', item)}
                  aoRemover={(index) => removerItem('catAparelhos', index)}
                />
                <GerenciadorLista 
                  titulo="Marcas (Fabricantes)" 
                  descricao="Ex: Apple, Samsung, Xiaomi..."
                  placeholder="Nova marca..."
                  itens={listas.marcas}
                  aoAdicionar={(item) => adicionarItem('marcas', item)}
                  aoRemover={(index) => removerItem('marcas', index)}
                />
                <GerenciadorLista 
                  titulo="Capacidades de Armazenamento" 
                  descricao="Ex: 64 GB, 128 GB, 1 TB..."
                  placeholder="Nova capacidade..."
                  itens={listas.capacidades}
                  aoAdicionar={(item) => adicionarItem('capacidades', item)}
                  aoRemover={(index) => removerItem('capacidades', index)}
                />
                <GerenciadorLista 
                  titulo="Paleta de Cores" 
                  descricao="Cores utilizadas no cadastro de aparelhos/acessórios."
                  placeholder="Nova cor..."
                  itens={listas.cores}
                  aoAdicionar={(item) => adicionarItem('cores', item)}
                  aoRemover={(index) => removerItem('cores', index)}
                />
                <GerenciadorLista 
                  titulo="Status de Disponibilidade" 
                  descricao="Controle do estado do produto no estoque."
                  placeholder="Novo status..."
                  itens={listas.disponibilidade}
                  aoAdicionar={(item) => adicionarItem('disponibilidade', item)}
                  aoRemover={(index) => removerItem('disponibilidade', index)}
                />
                <GerenciadorLista 
                  titulo="Qualidade de Peças (Manutenção)" 
                  descricao="Atributos para diferenciar qualidade de telas e baterias."
                  placeholder="Nova qualidade..."
                  itens={listas.qualidadePecas}
                  aoAdicionar={(item) => adicionarItem('qualidadePecas', item)}
                  aoRemover={(index) => removerItem('qualidadePecas', index)}
                />
              </div>
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
                    {formasPagamento.map((forma) => (
                      <tr key={forma.id} style={styles.tr}>
                        <td style={{...styles.td, color: '#e2e8f0', fontWeight: 'bold'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <CreditCard size={14} color="#64748b" /> {forma.nome}
                          </div>
                        </td>
                        <td style={styles.td}>{forma.tipo}</td>
                        <td style={{...styles.td, color: forma.taxa === '0.00' || forma.taxa === '0' ? '#4ade80' : '#fbbf24', fontWeight: 'bold'}}>
                          {forma.taxa}%
                        </td>
                        <td style={styles.td}>{forma.prazo}</td>
                        <td style={styles.td}>
                          <span style={styles.badgeSuccess}>Ativo</span>
                        </td>
                        <td style={{...styles.td, textAlign: 'center'}}>
                          <button style={styles.iconBtn} onClick={() => abrirModalPagamento(forma)}><Edit size={14} /></button>
                          <button style={{...styles.iconBtn, color: '#ef4444'}} onClick={() => removerPagamento(forma.id)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '40px'}}>Regras e Categorias Financeiras</h3>
              
              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Cálculo Automático de Juros e Multa (Inadimplência)</h4>
                  <p style={styles.toggleDesc}>Atualiza o valor a receber automaticamente se o título passar do vencimento (Boleto/Promissória).</p>
                </div>
                <Switch ativo={toggles.jurosAuto} onClick={() => handleToggle('jurosAuto')} />
              </div>

              <div style={styles.grid2}>
                <GerenciadorLista 
                  titulo="Plano de Contas (Categorias)" 
                  descricao="Categorias para classificar receitas e despesas da loja."
                  placeholder="Nova categoria financeira..."
                  itens={listas.planoContas}
                  aoAdicionar={(item) => adicionarItem('planoContas', item)}
                  aoRemover={(index) => removerItem('planoContas', index)}
                />
              </div>
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

              <div style={{backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
                <span style={{fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>VARIÁVEIS DISPONÍVEIS (Clique para copiar):</span>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  {['[NOME_EMPRESA]', '[CNPJ_EMPRESA]', '[NOME_CLIENTE]', '[CPF_CLIENTE]', '[DATA_VENDA]', '[NOME_VENDEDOR]', '[PRAZO_GARANTIA]', '[NUMERO_RECIBO]'].map(tag => (
                    <span key={tag} style={styles.varTag} onClick={() => navigator.clipboard.writeText(tag)}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px'}}>
                  <label style={{...styles.label, color: '#e2e8f0', fontSize: '14px'}}>Termo de Garantia (Recibo de Venda):</label>
                  <button 
                    style={{...styles.btnActionSecondary, backgroundColor: previewGarantia ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}} 
                    onClick={() => setPreviewGarantia(!previewGarantia)}
                  >
                    {previewGarantia ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {previewGarantia ? 'Voltar para Edição' : 'Pré-visualizar (MOCK)'}
                  </button>
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
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px'}}>
                  <label style={{...styles.label, color: '#e2e8f0', fontSize: '14px'}}>Termo de Entrada (Ordem de Serviço):</label>
                  <button 
                    style={{...styles.btnActionSecondary, backgroundColor: previewOS ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}} 
                    onClick={() => setPreviewOS(!previewOS)}
                  >
                    {previewOS ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {previewOS ? 'Voltar para Edição' : 'Pré-visualizar (MOCK)'}
                  </button>
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

            </div>
          )}

          {/* --- FISCAL --- */}
          {abaAtiva === 'fiscal' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Nota Fiscal Eletrônica</h3>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Ambiente de Homologação?</label>
                  <select style={styles.input}>
                    <option>Não (Produção)</option>
                    <option>Sim (Testes)</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Última NFE Emitida:</label>
                  <input style={styles.input} placeholder="Nº da NFE" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Série NFE:</label>
                  <input style={styles.input} placeholder="Ex: 1" />
                </div>
              </div>

              <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Certificado Digital</h3>
              <div style={{...styles.logoUploadArea, marginTop: '10px'}}>
                <div style={{...styles.logoPlaceholder, width: '40px', height: '40px', borderRadius: '4px'}}><FileText size={20}/></div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', flex: 1}}>
                  <span style={{color: '#e2e8f0', fontSize: '13px', fontWeight: 'bold'}}>Certificado (.pfx, .p12)</span>
                  <span style={{color: '#94a3b8', fontSize: '12px'}}>Nenhum arquivo escolhido.</span>
                  <button style={styles.btnUpload}><UploadCloud size={14} /> Carregar Arquivo</button>
                </div>
              </div>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Senha certificado:</label>
                  <input style={styles.input} type="password" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Validade do certificado:</label>
                  <input style={styles.input} disabled placeholder="Carregue o certificado primeiro" />
                </div>
              </div>
            </div>
          )}

          {/* --- RELATÓRIOS --- */}
          {abaAtiva === 'relatorios' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Configurações de Relatórios</h3>
              <div style={styles.toggleRow}>
                <div>
                  <h4 style={styles.toggleTitle}>Receber Resumo Diário por E-mail</h4>
                  <p style={styles.toggleDesc}>Envia um e-mail com o fechamento de caixa e lucro gerado sempre às 23:00.</p>
                </div>
                <Switch ativo={toggles.resumoEmail} onClick={() => handleToggle('resumoEmail')} />
              </div>
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
                  onChange={(e) => setFormDataPagamento({...formDataPagamento, tipo: e.target.value})}
                >
                  <option value="Crédito">Cartão de Crédito</option>
                  <option value="Débito">Cartão de Débito</option>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro Físico</option>
                  <option value="Boleto">Boleto Bancário</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.required}>*</span> Taxa da Operadora (%):</label>
                <input 
                  style={styles.input} 
                  type="number"
                  placeholder="Ex: 3.49"
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
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalPagamentoAberto(false)}>Cancelar</button>
              <button style={styles.btnSaveModal} onClick={salvarPagamento}>Salvar Forma de Pagamento</button>
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

  /* Estilos do Gerenciador de Listas */
  listManagerCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  listManagerHeader: { borderBottom: '1px solid #1f2233', paddingBottom: '8px' },
  listManagerTitle: { color: '#e2e8f0', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' },
  listManagerDesc: { color: '#94a3b8', fontSize: '12px', margin: 0 },
  listManagerInputArea: { display: 'flex', gap: '8px' },
  listManagerInput: { flex: 1, backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none' },
  listManagerBtnAdd: { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '0 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' },
  listManagerTags: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' },
  tag: { backgroundColor: '#161925', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '4px 8px 4px 12px', borderRadius: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  tagBtnRemove: { backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '50%' },
  
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
  btnAction: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
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