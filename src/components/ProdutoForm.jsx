import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Smartphone, Headphones, PenTool, 
  Hash, Battery, CheckCircle, Calendar, FileText
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { formatBRL, onlyDigits, parseMoney } from '../utils/formatters';
import {
  formatMargemPercent,
  lucroEstimadoProduto,
  margemApartirDaVenda,
  sincronizarMargemComVenda,
  vendaApartirDaMargem,
} from '../domain/produtoPrecos';
import {
  mensagemConsultaIndisponivel,
  mensagemUpgradeConsultas,
} from '../domain/lojaPlanos';
import { listPessoasResumo } from '../services/pessoaService';
import {
  consultarImei,
  custoConsultaImei,
} from '../services/consultaService';
import {
  createProduto,
  getProdutoById,
  mapFormToProduto,
  mapProdutoToForm,
  updateProduto,
} from '../services/produtoService';
import CurrencyInput from './CurrencyInput';

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
  valorCusto: 0,
  custosExtras: 0,
  margemLucro: '',
  valorVenda: 0,
  dataEntrada: '',
  diasGarantia: '90',
  observacoes: '',
  fornecedorId: '',
  numeroNfeEntrada: '',
  ncm: '',
  cfop: '5102',
  unidade: 'UN',
  icmsOrigem: '0',
  icmsSituacaoTributaria: '102',
};

const ProdutoForm = ({ aoVoltar, produtoId = null }) => {
  const { lojaAtivaId, podeConsultas, lojaAtiva } = useLoja();
  const { alert, confirm } = useDialog();
  const isEdicao = Boolean(produtoId);
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('gerais');
  const [tipoItem, setTipoItem] = useState('aparelho');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [codigo, setCodigo] = useState(null);
  const [pessoas, setPessoas] = useState([]);
  const [consultandoImei, setConsultandoImei] = useState(false);
  const [resultadoImei, setResultadoImei] = useState(null);
  /** Último campo que o usuário editou de propósito: 'margem' | 'venda' */
  const precoDriverRef = useRef('venda');

  useEffect(() => {
    if (!lojaAtivaId) return;

    listPessoasResumo(lojaAtivaId).then(({ data, error }) => {
      if (!error && data) setPessoas(data);
    });
  }, [lojaAtivaId]);

  useEffect(() => {
    if (!produtoId || !lojaAtivaId) return;

    const carregar = async () => {
      setCarregando(true);
      const { data, error } = await getProdutoById(lojaAtivaId, produtoId);

      if (error || !data) {
        await alert(error?.message ?? 'Não foi possível carregar o produto.', { type: 'error', title: 'Erro' });
        aoVoltar();
        return;
      }

      setTipoItem(data.tipo ?? 'aparelho');
      setCodigo(data.codigo ?? null);
      setFormData(mapProdutoToForm(data));
      precoDriverRef.current = 'venda';
      setCarregando(false);
    };

    carregar();
  }, [produtoId, lojaAtivaId, aoVoltar]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMoneyField = (field, num) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: num };

      if (field === 'valorCusto' || field === 'custosExtras') {
        // Loja de celular: preço de venda costuma ser o âncora de mercado.
        // Se o usuário estava dirigindo pela margem %, mantém a % e recalcula a venda.
        if (precoDriverRef.current === 'margem' && next.margemLucro !== '' && next.margemLucro != null) {
          next.valorVenda = vendaApartirDaMargem(next.valorCusto, next.custosExtras, next.margemLucro);
        } else {
          next.margemLucro = sincronizarMargemComVenda(
            next.valorCusto,
            next.custosExtras,
            next.valorVenda,
            next.margemLucro
          );
        }
      }

      if (field === 'valorVenda') {
        precoDriverRef.current = 'venda';
        const m = margemApartirDaVenda(next.valorCusto, next.custosExtras, num);
        next.margemLucro = m == null ? '' : formatMargemPercent(m);
      }

      return next;
    });
  };

  const handleMargemChange = (e) => {
    const raw = e.target.value.replace(',', '.');
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;

    precoDriverRef.current = 'margem';
    setFormData((prev) => {
      const next = { ...prev, margemLucro: raw };
      if (raw !== '' && Number.isFinite(Number(raw))) {
        next.valorVenda = vendaApartirDaMargem(prev.valorCusto, prev.custosExtras, raw);
      }
      return next;
    });
  };

  const lucroEstimado = lucroEstimadoProduto(
    formData.valorCusto,
    formData.custosExtras,
    formData.valorVenda
  );

  const consultarImeiAnatel = async () => {
    const imei = onlyDigits(formData.imei1);
    if (imei.length !== 15) {
      await alert('Informe um IMEI 1 com 15 dígitos para consultar na Anatel.', {
        type: 'warning',
        title: 'IMEI',
      });
      return;
    }

    if (!podeConsultas) {
      await alert(mensagemUpgradeConsultas(lojaAtiva?.plano), {
        type: 'warning',
        title: 'Plano',
      });
      return;
    }

    const custo = custoConsultaImei();
    const ok = await confirm(
      `Consulta Anatel (Celular Legal) usa ${custo} crédito${custo === 1 ? '' : 's'}.\n\n` +
        'Ao continuar, declaro que a loja possui base legal / autorização para esta verificação (LGPD / due diligence).',
      { title: 'Confirmar consulta IMEI', confirmLabel: 'Consultar' }
    );
    if (!ok) return;

    setConsultandoImei(true);
    const result = await consultarImei(lojaAtivaId, imei);
    setConsultandoImei(false);

    if (!result.ok) {
      if (result.code === 'provider_not_configured') {
        await alert(mensagemConsultaIndisponivel({ podeConsultas }), {
          type: 'warning',
          title: 'Consulta indisponível',
        });
        return;
      }
      await alert(result.error?.message || 'Não foi possível consultar o IMEI.', {
        type: 'error',
        title: 'Erro',
      });
      return;
    }

    setResultadoImei(result.dados);
    await alert(result.dados?.mensagem || 'Consulta IMEI concluída.', {
      type: result.dados?.bloqueado ? 'warning' : 'success',
      title: result.dados?.bloqueado ? 'Alerta Anatel' : 'IMEI OK',
    });
  };

  const salvarProduto = async () => {
    if (!formData.nome.trim() || !formData.marca.trim() || !formData.categoria.trim()) {
      await alert('Preencha categoria, marca e nome do produto.', { type: 'warning', title: 'Campos obrigatórios' });
      return;
    }

    if (parseMoney(formData.valorVenda) <= 0) {
      await alert('Informe um valor de venda maior que zero.', { type: 'warning', title: 'Preço' });
      setAbaAtiva('precos');
      return;
    }

    if (!lojaAtivaId) {
      await alert('Nenhuma loja ativa selecionada.', { type: 'error', title: 'Erro' });
      return;
    }

    setSalvando(true);
    const payload = mapFormToProduto(formData, { tipoItem });
    const { error } = isEdicao
      ? await updateProduto(lojaAtivaId, produtoId, payload)
      : await createProduto(lojaAtivaId, payload);

    setSalvando(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível salvar o produto.', { type: 'error', title: 'Erro' });
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
        <button style={abaAtiva === 'fiscal' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('fiscal')}>Fiscal</button>
        <button style={abaAtiva === 'fornecedor' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('fornecedor')}>Fornecedor / NFe</button>
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
                  <input
                    style={styles.input}
                    placeholder="Gerado automaticamente"
                    value={codigo ?? ''}
                    disabled
                  />
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
                        <select style={styles.input} name="cor" value={formData.cor} onChange={handleChange}>
                          <option value="">Selecionar</option>
                          <option value="Preto">Preto</option>
                          <option value="Branco">Branco</option>
                          <option value="Azul Sierra">Azul Sierra</option>
                          <option value="Ouro">Ouro</option>
                        </select>
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Capacidade (GB):</label>
                        <select style={styles.input} name="capacidadeGb" value={formData.capacidadeGb} onChange={handleChange}>
                          <option value="">Selecionar</option>
                          <option value="64">64 GB</option>
                          <option value="128">128 GB</option>
                          <option value="256">256 GB</option>
                          <option value="512">512 GB</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}><span style={styles.required}>*</span> Estado do Aparelho:</label>
                      <select style={styles.input} name="estadoAparelho" value={formData.estadoAparelho} onChange={handleChange}>
                        <option value="">Selecionar...</option>
                        <option value="Novo (Lacrado)">Novo (Lacrado)</option>
                        <option value="Seminovo (Vitrine)">Seminovo (Vitrine)</option>
                        <option value="Usado (Comprado de Cliente)">Usado (Comprado de Cliente)</option>
                        <option value="Com Defeito">Com Defeito</option>
                      </select>
                    </div>
                  </>
                )}

                {/* --- CAMPOS ESPECÍFICOS PARA ACESSÓRIOS E PEÇAS --- */}
                {(tipoItem === 'acessorio' || tipoItem === 'peca') && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.required}>*</span> Aparelhos Compatíveis:</label>
                    <input
                      style={styles.input}
                      name="aparelhosCompativeis"
                      value={formData.aparelhosCompativeis}
                      onChange={handleChange}
                      placeholder="Ex: iPhone 13, iPhone 13 Pro..."
                    />
                  </div>
                )}

                {tipoItem === 'peca' && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.required}>*</span> Qualidade da Peça:</label>
                    <select style={styles.input} name="qualidadePeca" value={formData.qualidadePeca} onChange={handleChange}>
                      <option value="">Selecionar...</option>
                      <option value="Original Nacional / Retirada">Original Nacional / Retirada</option>
                      <option value="Premium (Incell / OLED)">Premium (Incell / OLED)</option>
                      <option value="Primeira Linha (AAA)">Primeira Linha (AAA)</option>
                      <option value="Paralela">Paralela</option>
                    </select>
                  </div>
                )}

                {tipoItem === 'acessorio' && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Cor / Estilo:</label>
                    <input
                      style={styles.input}
                      name="corEstilo"
                      value={formData.corEstilo}
                      onChange={handleChange}
                      placeholder="Ex: Transparente, Preto..."
                    />
                  </div>
                )}
              </div>

              {/* === COLUNA DIREITA === */}
              <div style={styles.column}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Código de Barras (EAN):</label>
                  <div style={styles.inputWithIcon}>
                    <input
                      style={styles.input}
                      name="ean"
                      value={formData.ean}
                      onChange={handleChange}
                      placeholder="Bipar código..."
                    />
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
                      <div style={{ display: 'flex' }}>
                        <input
                          style={{ ...styles.input, borderRadius: '4px 0 0 4px', borderRight: 'none' }}
                          name="imei1"
                          value={formData.imei1}
                          onChange={(e) => {
                            setResultadoImei(null);
                            handleChange(e);
                          }}
                          placeholder="Digite o IMEI principal"
                          maxLength={15}
                        />
                        <button
                          type="button"
                          onClick={consultarImeiAnatel}
                          disabled={consultandoImei}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #2a2e3f',
                            borderLeft: 'none',
                            color: '#38bdf8',
                            padding: '0 12px',
                            borderRadius: '0 4px 4px 0',
                            cursor: consultandoImei ? 'wait' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {consultandoImei ? '...' : 'Anatel'}
                        </button>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                        Consulta Celular Legal · 2 créditos · plano Profissional
                      </span>
                      {resultadoImei && (
                        <span
                          style={{
                            marginTop: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: resultadoImei.bloqueado ? '#f87171' : '#4ade80',
                          }}
                        >
                          {resultadoImei.bloqueado ? 'ALERTA: ' : 'OK: '}
                          {resultadoImei.mensagem}
                        </span>
                      )}
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>IMEI 2 (Opcional):</label>
                      <div style={styles.inputWithIcon}>
                        <input
                          style={styles.input}
                          name="imei2"
                          value={formData.imei2}
                          onChange={handleChange}
                          placeholder="Digite o IMEI secundário"
                          maxLength={15}
                        />
                        <Hash size={16} style={styles.innerIcon} />
                      </div>
                    </div>

                    <div style={styles.grid2Inner}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Saúde Bateria (%):</label>
                        <div style={styles.inputWithIcon}>
                          <input
                            style={styles.input}
                            name="saudeBateria"
                            value={formData.saudeBateria}
                            onChange={handleChange}
                            placeholder="Ex: 85"
                            type="number"
                            min="0"
                            max="100"
                          />
                          <Battery size={16} style={styles.innerIcon} />
                        </div>
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Ciclos:</label>
                        <input
                          style={styles.input}
                          name="ciclosBateria"
                          value={formData.ciclosBateria}
                          onChange={handleChange}
                          placeholder="Ex: 342"
                          type="number"
                          min="0"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div style={styles.grid2Inner}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Data de Entrada:</label>
                    <div style={styles.inputWithIcon}>
                      <input
                        style={styles.input}
                        type="date"
                        name="dataEntrada"
                        value={formData.dataEntrada}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Dias de Garantia:</label>
                    <input
                      style={styles.input}
                      name="diasGarantia"
                      value={formData.diasGarantia}
                      onChange={handleChange}
                      placeholder="Ex: 90"
                      type="number"
                      min="0"
                    />
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
                <input
                  style={{...styles.input, fontSize: '16px', fontWeight: 'bold', opacity: isEdicao ? 0.75 : 1}}
                  name="quantidadeAtual"
                  value={formData.quantidadeAtual}
                  onChange={handleChange}
                  type="number"
                  disabled={isEdicao}
                  title={isEdicao ? 'Altere o saldo em Movimentações ou Inventário' : undefined}
                />
                {isEdicao && (
                  <p style={{ color: '#94a3b8', fontSize: '11px', margin: '6px 0 0', lineHeight: 1.4 }}>
                    Saldo bloqueado na edição — use Movimentações / Inventário para não divergir do livro de estoque.
                  </p>
                )}
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantidade Mínima (Alerta de Ruptura):</label>
                <input style={styles.input} name="quantidadeMinima" value={formData.quantidadeMinima} onChange={handleChange} placeholder="Ex: 2" type="number" />
              </div>
            </div>

            <div style={styles.column}>
              <h3 style={styles.sectionSubtitle}>Formação de Preço</h3>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px', lineHeight: 1.45 }}>
                Dois jeitos: informe a <strong style={{ color: '#cbd5e1' }}>margem %</strong> e a venda/lucro
                calculam — ou informe o <strong style={{ color: '#cbd5e1' }}>valor de venda</strong> e a margem %
                se ajusta. Lucro em R$ é sempre automático.
              </p>

              <div style={styles.grid2Inner}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Valor de Custo (R$):</label>
                  <CurrencyInput
                    style={styles.input}
                    name="valorCusto"
                    value={formData.valorCusto}
                    onChange={(v) => handleMoneyField('valorCusto', v)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Custos Extras (Frete/Taxa):</label>
                  <CurrencyInput
                    style={styles.input}
                    name="custosExtras"
                    value={formData.custosExtras}
                    onChange={(v) => handleMoneyField('custosExtras', v)}
                  />
                </div>
              </div>

              <div style={styles.grid2Inner}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Margem sobre o custo (%):</label>
                  <input
                    style={styles.input}
                    name="margemLucro"
                    value={formData.margemLucro}
                    onChange={handleMargemChange}
                    placeholder="Ex: 12,5 ou 30"
                    inputMode="decimal"
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Lucro estimado (R$):</label>
                  <input
                    style={{...styles.input, color: lucroEstimado >= 0 ? '#4ade80' : '#f87171'}}
                    value={formatBRL(lucroEstimado)}
                    disabled
                  />
                </div>
              </div>

              <div style={{...styles.inputGroup, marginTop: '10px'}}>
                <label style={styles.label}><span style={styles.required}>*</span> Valor de Venda (R$):</label>
                <CurrencyInput
                  style={{...styles.input, fontSize: '18px', fontWeight: 'bold', color: '#38bdf8', borderColor: '#38bdf8'}}
                  name="valorVenda"
                  value={formData.valorVenda}
                  onChange={(v) => handleMoneyField('valorVenda', v)}
                />
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'fiscal' && (
          <div style={styles.column}>
            <h3 style={styles.sectionSubtitle}>Classificação fiscal (NFC-e)</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', lineHeight: 1.45 }}>
              NCM é obrigatório para emissão real. Padrões abaixo servem para Simples Nacional / venda interna.
            </p>
            <div style={styles.grid2Inner}>
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.required}>*</span> NCM (8 dígitos)</label>
                <input
                  style={styles.input}
                  name="ncm"
                  value={formData.ncm}
                  onChange={handleChange}
                  placeholder="Ex: 85171231"
                  maxLength={10}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>CFOP</label>
                <input style={styles.input} name="cfop" value={formData.cfop} onChange={handleChange} placeholder="5102" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Unidade</label>
                <input style={styles.input} name="unidade" value={formData.unidade} onChange={handleChange} placeholder="UN" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Origem ICMS</label>
                <select style={styles.input} name="icmsOrigem" value={formData.icmsOrigem} onChange={handleChange}>
                  <option value="0">0 — Nacional</option>
                  <option value="1">1 — Estrangeira (importação direta)</option>
                  <option value="2">2 — Estrangeira (mercado interno)</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>CSOSN / CST</label>
                <input
                  style={styles.input}
                  name="icmsSituacaoTributaria"
                  value={formData.icmsSituacaoTributaria}
                  onChange={handleChange}
                  placeholder="102"
                />
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
                <select style={styles.input} name="fornecedorId" value={formData.fornecedorId} onChange={handleChange}>
                  <option value="">
                    {pessoas.length ? 'Selecione o contato...' : 'Nenhum contato cadastrado — cadastre em Pessoas'}
                  </option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nº da Nota Fiscal ou Recibo de Entrada:</label>
                <input
                  style={styles.input}
                  name="numeroNfeEntrada"
                  value={formData.numeroNfeEntrada}
                  onChange={handleChange}
                  placeholder="Ex: 12543"
                />
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