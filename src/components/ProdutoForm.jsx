import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Smartphone, Headphones, PenTool, 
  Hash, Battery, CheckCircle, Calendar, FileText
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import {
  createProduto,
  getProdutoById,
  mapFormToProduto,
  mapProdutoToForm,
  updateProduto,
} from '../services/produtoService';

const EMPTY_FORM = {
  categoria: '',
  marca: '',
  nome: '',
  ean: '',
  disponibilidade: 'Disponível para venda',
  cor: '',
  capacidadeGb: '',
  estadoAparelho: '',
  imei1: '',
  imei2: '',
  saudeBateria: '',
  ciclosBateria: '',
  aparelhosCompativeis: '',
  qualidadePeca: '',
  corEstilo: '',
  quantidadeAtual: '1',
  quantidadeMinima: '0',
  valorCusto: '',
  custosExtras: '',
  margemLucro: '',
  valorVenda: '',
  dataEntrada: '',
  diasGarantia: '90',
  observacoes: '',
};

const ProdutoForm = ({ aoVoltar, produtoId = null }) => {
  const { lojaAtivaId } = useLoja();
  const isEdicao = Boolean(produtoId);
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('gerais');
  const [tipoItem, setTipoItem] = useState('aparelho');
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!produtoId || !lojaAtivaId) return;

    const carregar = async () => {
      setCarregando(true);
      const { data, error } = await getProdutoById(lojaAtivaId, produtoId);

      if (error || !data) {
        alert(error?.message ?? 'Não foi possível carregar o produto.');
        aoVoltar();
        return;
      }

      setTipoItem(data.tipo ?? 'aparelho');
      setFormData(mapProdutoToForm(data));
      setCarregando(false);
    };

    carregar();
  }, [produtoId, lojaAtivaId, aoVoltar]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const salvarProduto = async () => {
    if (!formData.nome.trim() || !formData.marca.trim() || !formData.categoria.trim()) {
      alert('Preencha categoria, marca e nome do produto.');
      return;
    }

    if (!lojaAtivaId) {
      alert('Nenhuma loja ativa selecionada.');
      return;
    }

    setSalvando(true);
    const payload = mapFormToProduto(formData, { tipoItem });
    const { error } = isEdicao
      ? await updateProduto(lojaAtivaId, produtoId, payload)
      : await createProduto(lojaAtivaId, payload);

    setSalvando(false);

    if (error) {
      alert(error.message ?? 'Não foi possível salvar o produto.');
      return;
    }

    aoVoltar();
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>
            {isEdicao ? 'Editar Produto' : 'Cadastrar Produto em Estoque'}
          </h2>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.btnSave} onClick={salvarProduto} disabled={salvando || carregando}>
            <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Carregando produto...</div>
      ) : (
      <>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button style={abaAtiva === 'gerais' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('gerais')}>Dados Gerais</button>
        <button style={abaAtiva === 'precos' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('precos')}>Preços e Custos</button>
        <button style={abaAtiva === 'fornecedor' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('fornecedor')}>Fornecedor / NFe</button>
        <button style={abaAtiva === 'imagens' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('imagens')}>Imagens</button>
      </div>

      <div style={styles.content}>
        
        {abaAtiva === 'gerais' && (
          <>
            {/* Seletor Rápido de Tipo de Produto */}
            <div style={styles.typeSelectorGroup}>
              <button 
                style={{...styles.typeBtn, ...(tipoItem === 'aparelho' ? styles.typeBtnActive : {})}} 
                onClick={() => setTipoItem('aparelho')}
              >
                <Smartphone size={16} /> Aparelho
              </button>
              <button 
                style={{...styles.typeBtn, ...(tipoItem === 'acessorio' ? styles.typeBtnActive : {})}} 
                onClick={() => setTipoItem('acessorio')}
              >
                <Headphones size={16} /> Acessório
              </button>
              <button 
                style={{...styles.typeBtn, ...(tipoItem === 'peca' ? styles.typeBtnActive : {})}} 
                onClick={() => setTipoItem('peca')}
              >
                <PenTool size={16} /> Peça
              </button>
            </div>

            <div style={styles.grid2}>
              {/* === COLUNA ESQUERDA === */}
              <div style={styles.column}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Código (SKU):</label>
                  <input style={styles.input} placeholder="Gerado automaticamente" disabled />
                </div>

                {/* Campo Dinâmico: Categoria */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.required}>*</span> 
                    {tipoItem === 'aparelho' ? 'Categoria do Aparelho:' : tipoItem === 'acessorio' ? 'Tipo de Acessório:' : 'Tipo de Peça:'}
                  </label>
                  <select style={styles.input} name="categoria" value={formData.categoria} onChange={handleChange}>
                    <option value="">Selecionar...</option>
                    {tipoItem === 'aparelho' && (
                      <><option value="Smartphone">Smartphone</option><option value="Tablet">Tablet</option><option value="Smartwatch">Smartwatch</option></>
                    )}
                    {tipoItem === 'acessorio' && (
                      <><option value="Capa / Case">Capa / Case</option><option value="Película">Película</option><option value="Cabo USB">Cabo USB</option><option value="Carregador (Fonte)">Carregador (Fonte)</option><option value="Fone de Ouvido">Fone de Ouvido</option></>
                    )}
                    {tipoItem === 'peca' && (
                      <><option value="Tela / Display Frontal">Tela / Display Frontal</option><option value="Bateria">Bateria</option><option value="Conector de Carga">Conector de Carga</option><option value="Câmera">Câmera</option><option value="Tampa Traseira">Tampa Traseira</option></>
                    )}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Marca:</label>
                  <select style={styles.input} name="marca" value={formData.marca} onChange={handleChange}>
                    <option value="">Selecionar...</option>
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Motorola">Motorola</option>
                    <option value="Xiaomi">Xiaomi</option>
                    {tipoItem !== 'aparelho' && <option value="Genérica / Primeira Linha">Genérica / Primeira Linha</option>}
                    {tipoItem !== 'aparelho' && <option value="Baseus / Hrebos / Foxconn">Baseus / Hrebos / Foxconn</option>}
                  </select>
                </div>

                {/* Campo Dinâmico: Nome / Modelo */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.required}>*</span> 
                    {tipoItem === 'aparelho' ? 'Modelo do Aparelho:' : tipoItem === 'acessorio' ? 'Nome do Acessório:' : 'Nome da Peça:'}
                  </label>
                  <input style={styles.input} name="nome" value={formData.nome} onChange={handleChange} placeholder={
                    tipoItem === 'aparelho' ? "Ex: iPhone 13 Pro Max" : 
                    tipoItem === 'acessorio' ? "Ex: Capa de Silicone MagSafe" : 
                    "Ex: Bateria Premium iPhone 11"
                  } />
                </div>

                {/* --- CAMPOS ESPECÍFICOS PARA APARELHOS --- */}
                {tipoItem === 'aparelho' && (
                  <>
                    <div style={styles.grid2Inner}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Cor:</label>
                        <select style={styles.input}>
                          <option>Selecionar</option>
                          <option>Preto</option>
                          <option>Branco</option>
                          <option>Azul Sierra</option>
                          <option>Ouro</option>
                        </select>
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Capacidade (GB):</label>
                        <select style={styles.input}>
                          <option>Selecionar</option>
                          <option>64 GB</option>
                          <option>128 GB</option>
                          <option>256 GB</option>
                          <option>512 GB</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}><span style={styles.required}>*</span> Estado do Aparelho:</label>
                      <select style={styles.input}>
                        <option>Novo (Lacrado)</option>
                        <option>Seminovo (Vitrine)</option>
                        <option>Usado (Comprado de Cliente)</option>
                        <option>Com Defeito</option>
                      </select>
                    </div>
                  </>
                )}

                {/* --- CAMPOS ESPECÍFICOS PARA ACESSÓRIOS E PEÇAS --- */}
                {(tipoItem === 'acessorio' || tipoItem === 'peca') && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.required}>*</span> Aparelhos Compatíveis:</label>
                    <input style={styles.input} placeholder="Ex: iPhone 13, iPhone 13 Pro..." />
                  </div>
                )}

                {tipoItem === 'peca' && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.required}>*</span> Qualidade da Peça:</label>
                    <select style={styles.input}>
                      <option>Original Nacional / Retirada</option>
                      <option>Premium (Incell / OLED)</option>
                      <option>Primeira Linha (AAA)</option>
                      <option>Paralela</option>
                    </select>
                  </div>
                )}

                {tipoItem === 'acessorio' && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Cor / Estilo:</label>
                    <input style={styles.input} placeholder="Ex: Transparente, Preto..." />
                  </div>
                )}
              </div>

              {/* === COLUNA DIREITA === */}
              <div style={styles.column}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Código de Barras (EAN):</label>
                  <div style={styles.inputWithIcon}>
                    <input style={styles.input} placeholder="Bipar código..." />
                    <Hash size={16} style={styles.innerIcon} />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Disponibilidade:</label>
                  <select style={styles.input} name="disponibilidade" value={formData.disponibilidade} onChange={handleChange}>
                    <option value="Disponível para venda">Disponível para venda</option>
                    <option value="Uso Interno (Assistência)">Uso Interno (Assistência)</option>
                    <option value="Aguardando Conserto">Aguardando Conserto</option>
                  </select>
                </div>

                {/* Rastreio e Bateria (Apenas Aparelhos) */}
                {tipoItem === 'aparelho' && (
                  <>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>IMEI 1:</label>
                      <div style={styles.inputWithIcon}>
                        <input style={styles.input} placeholder="Digite o IMEI principal" />
                        <Hash size={16} style={styles.innerIcon} />
                      </div>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>IMEI 2 (Opcional):</label>
                      <div style={styles.inputWithIcon}>
                        <input style={styles.input} placeholder="Digite o IMEI secundário" />
                        <Hash size={16} style={styles.innerIcon} />
                      </div>
                    </div>

                    <div style={styles.grid2Inner}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Saúde Bateria (%):</label>
                        <div style={styles.inputWithIcon}>
                          <input style={styles.input} placeholder="Ex: 85" type="number" />
                          <Battery size={16} style={styles.innerIcon} />
                        </div>
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Ciclos:</label>
                        <input style={styles.input} placeholder="Ex: 342" type="number" />
                      </div>
                    </div>
                  </>
                )}

                <div style={styles.grid2Inner}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Data de Entrada:</label>
                    <div style={styles.inputWithIcon}>
                      <input style={styles.input} type="date" />
                    </div>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Dias de Garantia:</label>
                    <input style={styles.input} placeholder="Ex: 90" type="number" />
                  </div>
                </div>

              </div>
            </div>

            <div style={{...styles.inputGroup, marginTop: '15px'}}>
              <label style={styles.label}>Observações / Descrição Completa:</label>
              <textarea style={{...styles.input, height: '80px', resize: 'none'}} name="observacoes" value={formData.observacoes} onChange={handleChange} placeholder="Detalhes adicionais, marcas de uso, itens que acompanham na caixa..."></textarea>
            </div>
          </>
        )}

        {/* --- ABA DE PREÇOS E ESTOQUE --- */}
        {abaAtiva === 'precos' && (
          <div style={styles.grid2}>
            <div style={styles.column}>
              <h3 style={styles.sectionSubtitle}>Controle de Estoque</h3>
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.required}>*</span> Quantidade Atual (Saldo):</label>
                <input style={{...styles.input, fontSize: '16px', fontWeight: 'bold'}} name="quantidadeAtual" value={formData.quantidadeAtual} onChange={handleChange} type="number" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantidade Mínima (Alerta de Ruptura):</label>
                <input style={styles.input} name="quantidadeMinima" value={formData.quantidadeMinima} onChange={handleChange} placeholder="Ex: 2" type="number" />
              </div>
            </div>

            <div style={styles.column}>
              <h3 style={styles.sectionSubtitle}>Formação de Preço</h3>
              
              <div style={styles.grid2Inner}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Valor de Custo (R$):</label>
                  <input style={styles.input} name="valorCusto" value={formData.valorCusto} onChange={handleChange} placeholder="0,00" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Custos Extras (Frete/Taxa):</label>
                  <input style={styles.input} name="custosExtras" value={formData.custosExtras} onChange={handleChange} placeholder="0,00" />
                </div>
              </div>

              <div style={styles.grid2Inner}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Margem de Lucro (%):</label>
                  <input style={styles.input} placeholder="Ex: 30%" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Lucro Estimado (R$):</label>
                  <input style={{...styles.input, color: '#4ade80'}} placeholder="0,00" disabled />
                </div>
              </div>

              <div style={{...styles.inputGroup, marginTop: '10px'}}>
                <label style={styles.label}><span style={styles.required}>*</span> Valor de Venda (R$):</label>
                <input style={{...styles.input, fontSize: '18px', fontWeight: 'bold', color: '#38bdf8', borderColor: '#38bdf8'}} name="valorVenda" value={formData.valorVenda} onChange={handleChange} placeholder="0,00" />
              </div>
            </div>
          </div>
        )}

        {/* --- ABA FORNECEDOR --- */}
        {abaAtiva === 'fornecedor' && (
          <div style={styles.column}>
             <h3 style={styles.sectionSubtitle}>Dados de Origem da Mercadoria</h3>
             <div style={styles.inputGroup}>
                <label style={styles.label}>Fornecedor / Cliente (Quem vendeu pra loja):</label>
                <select style={styles.input}>
                  <option>Buscar fornecedor na lista de contatos...</option>
                  <option>Apple Brasil LTDA</option>
                  <option>Cliente Pessoa Física (Aparelho pego na Troca)</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nº da Nota Fiscal ou Recibo de Entrada:</label>
                <input style={styles.input} placeholder="Ex: 12543" />
              </div>
          </div>
        )}

      </div>
      </>
      )}
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh', overflow: 'hidden' },
  header: { padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  headerActions: { display: 'flex', gap: '10px' },
  btnSave: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  tabsContainer: { display: 'flex', backgroundColor: '#161925', borderBottom: '1px solid #1f2233', padding: '0 20px' },
  tab: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '15px 20px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderBottom: '2px solid transparent' },
  tabActive: { backgroundColor: 'transparent', border: 'none', color: '#38bdf8', padding: '15px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', borderBottom: '2px solid #38bdf8' },

  content: { padding: '24px', overflowY: 'auto', flex: 1 },
  
  typeSelectorGroup: { display: 'flex', gap: '10px', marginBottom: '25px', backgroundColor: '#0f111a', padding: '6px', borderRadius: '8px', border: '1px solid #1f2233', width: 'fit-content' },
  typeBtn: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '8px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' },
  typeBtnActive: { backgroundColor: '#3b82f6', color: '#fff' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' },
  grid2Inner: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  column: { display: 'flex', flexDirection: 'column', gap: '15px' },
  
  sectionSubtitle: { color: '#e2e8f0', fontSize: '14px', marginBottom: '10px', borderBottom: '1px solid #2a2e3f', paddingBottom: '8px' },

  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '12px', color: '#64748b' },
};

export default ProdutoForm;