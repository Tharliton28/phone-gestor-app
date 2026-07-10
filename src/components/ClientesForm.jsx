import React, { useState } from 'react';
import { 
  ArrowLeft, Save, MapPin, Trash2, Settings, 
  UploadCloud, FileText, CheckCircle, User, Calendar, AlertCircle, Info, X
} from 'lucide-react';

const ClientesForm = ({ aoVoltar }) => {
  const [abaAtiva, setAbaAtiva] = useState('dados-gerais');
  const [tipoPessoa, setTipoPessoa] = useState('Pessoa Física');
  const [categoria, setCategoria] = useState('Cliente');

  const [formData, setFormData] = useState({
    cpf: '', nome: '', origem: '', inscEstadual: '', indContribuinte: '',
    inscMunicipal: '', dataNascimento: '', genero: '', telefone: '',
    telefoneAlt: '', email: '', instagram: '', cep: '', rua: '',
    numero: '', bairro: '', cidade: '', estado: '', complemento: '',
    observacoes: ''
  });

  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [dadosConsulta, setDadosConsulta] = useState(null);

  // Estados dos Modais Customizados
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });
  const [modalConfirmarLimpeza, setModalConfirmarLimpeza] = useState(false);

  const mostrarAviso = (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    setModalAviso({ aberto: true, titulo, mensagem, tipo, acaoOk });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if(e.target.name === 'cpf') setDadosConsulta(null);
  };

  const limparFormulario = () => {
    setModalConfirmarLimpeza(true);
  };

  const confirmarLimpeza = () => {
    setFormData({
      cpf: '', nome: '', origem: '', inscEstadual: '', indContribuinte: '',
      inscMunicipal: '', dataNascimento: '', genero: '', telefone: '',
      telefoneAlt: '', email: '', instagram: '', cep: '', rua: '',
      numero: '', bairro: '', cidade: '', estado: '', complemento: '', observacoes: ''
    });
    setDadosConsulta(null);
    setModalConfirmarLimpeza(false);
  };

  const salvarCadastro = () => {
    if(!formData.nome) {
      return mostrarAviso('Atenção', 'O campo Nome é obrigatório!', 'erro');
    }
    // Mostra o sucesso e, ao clicar em OK, volta para a tela anterior
    mostrarAviso('Sucesso', 'Cadastro salvo com sucesso no banco de dados!', 'sucesso', () => aoVoltar());
  };

  const buscarCep = async () => {
    const cepLimpo = formData.cep.replace(/\D/g, ''); 
    if (cepLimpo.length !== 8) {
      return mostrarAviso('Atenção', 'Digite um CEP válido com 8 números (Ex: 01001000).', 'erro');
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        return mostrarAviso('Erro', 'CEP não encontrado na base de dados dos Correios.', 'erro');
      }

      setFormData(prev => ({
        ...prev,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }));
      
      mostrarAviso('Sucesso', 'Endereço encontrado e preenchido automaticamente!', 'sucesso');
    } catch (error) {
      mostrarAviso('Erro', 'Erro ao conectar com o serviço ViaCEP.', 'erro');
    }
  };

  const consultarCpfCnpj = () => {
    const documentoLimpo = formData.cpf.replace(/\D/g, '');

    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
      return mostrarAviso('Atenção', 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para consultar.', 'erro');
    }

    setBuscandoCpf(true);

    setTimeout(() => {
      setBuscandoCpf(false);
      
      const relatorio = {
        nome: documentoLimpo.length === 11 ? 'THARLITON DANTAS DUARTE' : 'EMPRESA SIMULADA LTDA',
        nascimento: documentoLimpo.length === 11 ? '1999-11-28' : 'N/A',
        idade: documentoLimpo.length === 11 ? '26' : 'N/A',
        cpf: formData.cpf,
        sexo: 'Masculino',
        nomeMae: 'MARIA LUSENIR PEREIRA DANTAS',
        situacao: 'REGULAR',
        atualizadoEm: '2018-10-16',
        protocolo: 'cd6d85fc-0d11-4f97-971c-7846783bd62f'
      };
      
      setDadosConsulta(relatorio);
      
      setFormData(prev => ({
        ...prev,
        nome: relatorio.nome,
        dataNascimento: relatorio.nascimento !== 'N/A' ? relatorio.nascimento : '',
        genero: relatorio.sexo
      }));

      setAbaAtiva('consulta-cpf');
    }, 1500);
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>Cadastro de Pessoa</h2>
        </div>
      </div>

      <div style={styles.content}>
        
        <div style={styles.tabsContainer}>
          <div style={styles.tabsGroup}>
            <button style={abaAtiva === 'dados-gerais' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('dados-gerais')}>
              Dados gerais
            </button>
            <button style={abaAtiva === 'anexos' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('anexos')}>
              Anexos <span style={styles.badgeCount}>0</span>
            </button>
            <button style={abaAtiva === 'dados-adicionais' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('dados-adicionais')}>
              Dados adicionais
            </button>
            <button style={abaAtiva === 'consulta-cpf' ? styles.tabActiveFilled : styles.tabFilled} onClick={() => setAbaAtiva('consulta-cpf')}>
              Consulta CPF
            </button>
          </div>
        </div>

        {abaAtiva === 'dados-gerais' && (
          <div style={styles.formArea}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '25px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{color: '#94a3b8', fontSize: '13px'}}>Tipo de vínculo:</span>
                <select style={styles.inputSelect} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option>Cliente</option>
                  <option>Fornecedor</option>
                  <option>Técnico</option>
                  <option>Motoboy</option>
                </select>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{color: '#94a3b8', fontSize: '13px'}}>Tipo:</span>
                <select style={styles.inputSelect} value={tipoPessoa} onChange={(e) => setTipoPessoa(e.target.value)}>
                  <option>Pessoa Física</option>
                  <option>Pessoa Jurídica</option>
                </select>
              </div>
            </div>

            <div style={styles.gridContainer}>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>
                  CPF/CNPJ: 
                  {dadosConsulta?.situacao === 'REGULAR' && (
                    <span style={{color: '#4ade80', marginLeft: '10px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                      <CheckCircle size={12} /> REGULAR
                    </span>
                  )}
                </label>
                <div style={{display: 'flex'}}>
                  <input 
                    style={{...styles.input, borderRadius: '4px 0 0 4px', borderRight: 'none'}} 
                    name="cpf" 
                    value={formData.cpf} 
                    onChange={handleChange} 
                    placeholder="000.000.000-00" 
                  />
                  <button 
                    style={styles.btnActionInsideInput} 
                    onClick={consultarCpfCnpj}
                    disabled={buscandoCpf}
                  >
                    {buscandoCpf ? 'Consultando...' : 'Consultar CPF/CNPJ'}
                  </button>
                </div>
              </div>
              
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}><span style={styles.required}>*</span> Nome:</label>
                <input style={styles.input} name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome completo" />
              </div>
              
              <div style={{...styles.inputGroup, gridColumn: 'span 1'}}>
                <label style={styles.label}>Origem:</label>
                <select style={styles.input} name="origem" value={formData.origem} onChange={handleChange}>
                  <option value="">Selecionar</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Indicacao">Indicação</option>
                  <option value="Passou na loja">Passou na loja</option>
                </select>
              </div>

              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Insc. Estadual:</label>
                <input style={styles.input} name="inscEstadual" value={formData.inscEstadual} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Indicador de contribuinte:</label>
                <select style={styles.input} name="indContribuinte" value={formData.indContribuinte} onChange={handleChange}>
                  <option value="">Selecionar</option>
                  <option>Não Contribuinte</option>
                  <option>Contribuinte ICMS</option>
                </select>
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Insc. Municipal:</label>
                <input style={styles.input} name="inscMunicipal" value={formData.inscMunicipal} onChange={handleChange} />
              </div>

              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Data de nascimento:</label>
                <input style={styles.input} type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Gênero:</label>
                <select style={styles.input} name="genero" value={formData.genero} onChange={handleChange}>
                  <option value="">Selecionar</option>
                  <option>Masculino</option>
                  <option>Feminino</option>
                  <option>Outro</option>
                </select>
              </div>
            </div>

            <h3 style={styles.sectionDivider}>Dados de contato</h3>
            <div style={styles.gridContainer}>
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Telefone / WhatsApp:</label>
                <input style={styles.input} name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Email:</label>
                <input style={styles.input} name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Telefone Alternativo:</label>
                <input style={styles.input} name="telefoneAlt" value={formData.telefoneAlt} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Instagram:</label>
                <input style={styles.input} name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@usuario" />
              </div>
            </div>

            <h3 style={styles.sectionDivider}>Dados de endereço</h3>
            <div style={styles.gridContainer}>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>CEP:</label>
                <input style={styles.input} name="cep" value={formData.cep} onChange={handleChange} placeholder="Ex: 01001000" />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 4'}}>
                <label style={styles.label}>Rua / Logradouro:</label>
                <input style={styles.input} name="rua" value={formData.rua} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Número:</label>
                <input style={styles.input} name="numero" value={formData.numero} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Bairro:</label>
                <input style={styles.input} name="bairro" value={formData.bairro} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Cidade:</label>
                <input style={styles.input} name="cidade" value={formData.cidade} onChange={handleChange} />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Estado:</label>
                <input style={styles.input} name="estado" value={formData.estado} onChange={handleChange} placeholder="Ex: SP" />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 4'}}>
                <label style={styles.label}>Complemento:</label>
                <input style={styles.input} name="complemento" value={formData.complemento} onChange={handleChange} placeholder="Apto, Bloco..." />
              </div>
            </div>

          </div>
        )}

        {abaAtiva === 'consulta-cpf' && (
          <div style={styles.formArea}>
            {!dadosConsulta ? (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', border: '1px dashed #2a2e3f', borderRadius: '8px'}}>
                <User size={48} color="#4b5563" style={{marginBottom: '15px'}} />
                <h3 style={{color: '#e2e8f0', margin: '0 0 10px 0'}}>Nenhuma consulta realizada</h3>
                <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '20px'}}>Volte na aba "Dados gerais", digite um CPF e clique em "Consultar CPF/CNPJ".</p>
                <button style={styles.btnPrimary} onClick={() => setAbaAtiva('dados-gerais')}>Ir para Dados gerais</button>
              </div>
            ) : (
              <>
                <div style={styles.reportBox}>
                  <div style={styles.reportHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <User size={18} color="#e2e8f0" />
                      <h3 style={{color: '#e2e8f0', fontSize: '16px', margin: 0}}>Informações Pessoais</h3>
                    </div>
                    {dadosConsulta.situacao === 'REGULAR' && (
                      <span style={styles.badgeRegularOutline}>REGULAR</span>
                    )}
                  </div>
                  
                  <div style={{padding: '20px'}}>
                    <p style={{color: '#64748b', fontSize: '12px', marginTop: 0, marginBottom: '20px'}}>Dados do cidadão consultado</p>
                    
                    <div style={styles.grid3}>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>NOME COMPLETO</span>
                        <span style={styles.dataValue}>{dadosConsulta.nome}</span>
                      </div>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>NASCIMENTO</span>
                        <span style={styles.dataValue}>{dadosConsulta.nascimento}</span>
                      </div>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>IDADE</span>
                        <span style={styles.dataValue}>{dadosConsulta.idade}</span>
                      </div>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>CPF</span>
                        <span style={styles.dataValue}>{dadosConsulta.cpf}</span>
                      </div>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>SEXO</span>
                        <span style={styles.dataValue}>{dadosConsulta.sexo}</span>
                      </div>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>NOME DA MÃE</span>
                        <span style={styles.dataValue}>{dadosConsulta.nomeMae}</span>
                      </div>
                    </div>

                    <div style={{marginTop: '30px', borderTop: '1px solid #1f2233', paddingTop: '20px'}}>
                      <div style={styles.dataBlock}>
                        <span style={styles.dataLabel}>SITUAÇÃO NA RECEITA</span>
                        <span style={styles.dataValue}>
                          <span style={styles.dotGreen}></span> {dadosConsulta.situacao} <span style={{color: '#64748b', fontWeight: 'normal', fontSize: '12px', marginLeft: '5px'}}>• Atualizado em {dadosConsulta.atualizadoEm}</span>
                        </span>
                      </div>
                      <div style={{...styles.dataBlock, marginTop: '20px'}}>
                        <span style={styles.dataLabel}>PROTOCOLO DA CONSULTA</span>
                        <span style={{...styles.dataValue, color: '#64748b', fontSize: '13px', fontWeight: 'normal'}}>{dadosConsulta.protocolo}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '20px', marginTop: '20px'}}>
                  <div style={styles.reportCard}>
                    <div style={styles.iconCircleGreen}><User size={20} color="#4ade80" /></div>
                    <span style={styles.cardLabel}>STATUS</span>
                    <span style={styles.cardValue}>{dadosConsulta.situacao}</span>
                  </div>
                  <div style={styles.reportCard}>
                    <div style={styles.iconCircleBlue}><Calendar size={20} color="#3b82f6" /></div>
                    <span style={styles.cardLabel}>IDADE</span>
                    <span style={styles.cardValue}>{dadosConsulta.idade}</span>
                  </div>
                  <div style={styles.reportCard}>
                    <div style={styles.iconCirclePurple}><User size={20} color="#a855f7" /></div>
                    <span style={styles.cardLabel}>GÊNERO</span>
                    <span style={styles.cardValue}>{dadosConsulta.sexo}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {abaAtiva === 'anexos' && (
           <div style={{...styles.formArea, minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #2a2e3f'}}>
           <UploadCloud size={48} color="#38bdf8" style={{marginBottom: '15px'}} />
           <h3 style={{color: '#e2e8f0', margin: '0 0 10px 0'}}>Nenhum anexo encontrado</h3>
           <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '20px'}}>Anexe fotos de documentos, contratos ou imagens.</p>
           <button style={styles.btnPrimary}>Selecionar Arquivos</button>
         </div>
        )}
        
        {abaAtiva === 'dados-adicionais' && (
           <div style={styles.formArea}>
             <div style={styles.inputGroup}>
                <label style={styles.label}>Observações e Anotações Internas:</label>
                <textarea style={{...styles.input, height: '150px'}} value={formData.observacoes} onChange={handleChange} name="observacoes"></textarea>
              </div>
           </div>
        )}

      </div>

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <button style={styles.btnPrimary} onClick={salvarCadastro}>
            <Save size={16} /> Salvar
          </button>
          <button style={styles.btnDangerOutline} onClick={limparFormulario}>
            <Trash2 size={16} /> Limpar formulário
          </button>
          <button style={styles.btnOutlineYellow} onClick={buscarCep}>
            <MapPin size={16} /> Buscar endereço
          </button>
          <button style={styles.btnBackBottom} onClick={aoVoltar}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <div>
          <button style={styles.btnConfig} onClick={() => mostrarAviso('Configurações', 'Módulo de customização de campos em desenvolvimento.', 'info')}>
            <Settings size={16} /> Configurar campos
          </button>
        </div>
      </div>

      {/* MODAL CUSTOMIZADO PARA AVISOS E ERROS */}
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
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>{modalAviso.mensagem}</p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.btnSaveModal, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6'}} 
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

      {/* MODAL PARA CONFIRMAÇÃO DE LIMPEZA */}
      {modalConfirmarLimpeza && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <AlertCircle size={18} color="#ef4444" /> Limpar Formulário
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>
                Tem certeza que deseja apagar todos os dados digitados? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancelModal} onClick={() => setModalConfirmarLimpeza(false)}>Cancelar</button>
              <button style={{...styles.btnSaveModal, backgroundColor: '#ef4444'}} onClick={confirmarLimpeza}>Sim, Limpar</button>
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
  content: { padding: '24px', overflowY: 'auto', flex: 1, paddingBottom: '100px' },
  
  tabsContainer: { borderBottom: '1px solid #1f2233', marginBottom: '25px' },
  tabsGroup: { display: 'flex', gap: '20px' },
  tab: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '10px 0', fontSize: '13px', cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px' },
  tabActive: { backgroundColor: 'transparent', border: 'none', color: '#38bdf8', padding: '10px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', borderBottom: '2px solid #38bdf8', display: 'flex', alignItems: 'center', gap: '6px' },
  
  tabFilled: { backgroundColor: '#161925', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', margin: '4px 0' },
  tabActiveFilled: { backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', margin: '4px 0' },
  badgeCount: { backgroundColor: '#1f2233', color: '#e2e8f0', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' },

  formArea: { backgroundColor: 'transparent' },
  inputSelect: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '13px', outline: 'none' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#94a3b8', fontSize: '12px', fontWeight: '500' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' },
  btnActionInsideInput: { backgroundColor: '#e2e8f0', color: '#0f111a', border: 'none', padding: '0 15px', borderRadius: '0 4px 4px 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' },
  sectionDivider: { color: '#fff', fontSize: '14px', margin: '30px 0 15px 0', paddingBottom: '10px', borderBottom: '1px solid #1f2233' },

  reportBox: { backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '8px' },
  reportHeader: { padding: '15px 20px', borderBottom: '1px solid #1f2233', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badgeRegularOutline: { border: '1px solid #4ade80', color: '#4ade80', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' },
  dataBlock: { display: 'flex', flexDirection: 'column', gap: '5px' },
  dataLabel: { color: '#64748b', fontSize: '11px', fontWeight: 'bold' },
  dataValue: { color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  dotGreen: { width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', display: 'inline-block', marginRight: '6px' },
  
  reportCard: { flex: 1, backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  iconCircleGreen: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconCircleBlue: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconCirclePurple: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardLabel: { color: '#64748b', fontSize: '11px', fontWeight: 'bold' },
  cardValue: { color: '#e2e8f0', fontSize: '15px', fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#11131c', borderTop: '1px solid #1f2233', padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 8px 8px', zIndex: 10 },
  footerLeft: { display: 'flex', gap: '15px' },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnDangerOutline: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutlineYellow: { backgroundColor: 'transparent', border: '1px solid #fbbf24', color: '#fbbf24', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnBackBottom: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnConfig: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },

  /* MODAIS CUSTOMIZADOS */
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnCancelModal: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnSaveModal: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
};

export default ClientesForm;