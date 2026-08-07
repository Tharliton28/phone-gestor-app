import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Trash2,
  CheckCircle, User, Calendar, Link2, MessageCircle
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import {
  createPessoa,
  getPessoaByCpfCnpj,
  getPessoaById,
  mapFormToPessoa,
  mapPessoaMeta,
  mapPessoaToForm,
  mergePessoaPayloadPreservando,
  mensagemErroPessoa,
  updatePessoa,
} from '../services/pessoaService';
import { formatTelefoneBr, onlyDigits, validateCpfCnpj } from '../utils/formatters';
import {
  consultarCpfCnpj as solicitarConsultaCpfCnpj,
  custoConsultaCpfCnpj,
} from '../services/consultaService';
import {
  criarLinkAutorizacaoConsulta,
  getLinkAutorizacaoPendente,
  getUltimaAutorizacaoAssinada,
} from '../services/autorizacaoConsultaService';
import { montarMensagemAutorizacaoConsulta } from '../domain/autorizacaoConsulta';
import { buildWhatsAppLink } from '../domain/osEvidencias';
import {
  mensagemConsultaIndisponivel,
  mensagemUpgradeConsultas,
} from '../domain/lojaPlanos';

const DIALOG_TYPE = {
  erro: 'error',
  sucesso: 'success',
  info: 'info',
  warning: 'warning',
};

function nascimentoToInputDate(value) {
  if (!value || value === '—') return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return '';
}

function mapSexoToGenero(sexo) {
  const s = String(sexo || '').trim().toUpperCase();
  if (!s || s === '—' || s === '-') return '';
  if (s === 'M' || s.startsWith('MASC')) return 'Masculino';
  if (s === 'F' || s.startsWith('FEM')) return 'Feminino';
  return 'Outro';
}

function situacaoEhRegular(situacao) {
  return String(situacao || '').toUpperCase().includes('REGULAR');
}

const ClientesForm = ({ aoVoltar, pessoaId = null, onPessoaSalva = null }) => {
  const { lojaAtivaId, podeConsultas, lojaAtiva, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const isEdicao = Boolean(pessoaId);
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('dados-gerais');
  const [tipoPessoa, setTipoPessoa] = useState('Pessoa Física');
  const [categoria, setCategoria] = useState('Cliente');

  const [formData, setFormData] = useState({
    cpf: '', nome: '', origem: '', inscEstadual: '', indContribuinte: '',
    inscMunicipal: '', dataNascimento: '', genero: '', telefone: '',
    telefoneAlt: '', email: '', instagram: '', cep: '', rua: '',
    numero: '', bairro: '', cidade: '', estado: '', complemento: '',
    observacoes: '',
    autorizaConsultaDados: false,
    autorizaConsultaEm: '',
    autorizaConsultaOrigem: '',
  });

  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [gerandoLinkAuth, setGerandoLinkAuth] = useState(false);
  const [linkAuthPendente, setLinkAuthPendente] = useState(null);
  const [evidenciaAuth, setEvidenciaAuth] = useState(null);
  const [cpfExistente, setCpfExistente] = useState(null);
  const [dadosConsulta, setDadosConsulta] = useState(null);
  const [situacaoLoja, setSituacaoLoja] = useState(null);
  const isPessoaFisica = tipoPessoa === 'Pessoa Física';
  const autorizacaoOk = Boolean(formData.autorizaConsultaDados);

  const mostrarAviso = async (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    await alert(mensagem, { title: titulo, type: DIALOG_TYPE[tipo] ?? tipo });
    if (acaoOk) acaoOk();
  };

  useEffect(() => {
    if (!pessoaId || !lojaAtivaId) return;

    const carregarPessoa = async () => {
      setCarregando(true);
      const { data, error } = await getPessoaById(lojaAtivaId, pessoaId);

      if (error || !data) {
        mostrarAviso(
          'Erro',
          error?.message ?? 'Não foi possível carregar o cadastro.',
          'erro',
          aoVoltar
        );
        setCarregando(false);
        return;
      }

      const meta = mapPessoaMeta(data);
      setTipoPessoa(meta.tipoPessoa);
      setCategoria(meta.categoria);
      setFormData(mapPessoaToForm(data));
      setCarregando(false);
    };

    carregarPessoa();
  }, [pessoaId, lojaAtivaId, aoVoltar]);

  useEffect(() => {
    if (!pessoaId || !lojaAtivaId) {
      setLinkAuthPendente(null);
      setEvidenciaAuth(null);
      return undefined;
    }

    let ativo = true;
    const sincronizar = async () => {
      const [{ data }, link, ultima] = await Promise.all([
        getPessoaById(lojaAtivaId, pessoaId),
        getLinkAutorizacaoPendente(lojaAtivaId, pessoaId),
        getUltimaAutorizacaoAssinada(lojaAtivaId, pessoaId),
      ]);
      if (!ativo) return;

      if (ultima.data) setEvidenciaAuth(ultima.data);
      else if (!data?.autoriza_consulta_dados) setEvidenciaAuth(null);

      if (data?.autoriza_consulta_dados) {
        setFormData((prev) => ({
          ...prev,
          autorizaConsultaDados: true,
          autorizaConsultaEm: data.autoriza_consulta_em ?? '',
          autorizaConsultaOrigem: data.autoriza_consulta_origem ?? '',
        }));
        setLinkAuthPendente(null);
        return;
      }

      setLinkAuthPendente(link.url || null);
    };

    sincronizar();
    const timer = setInterval(sincronizar, 5000);
    const onFocus = () => { sincronizar(); };
    window.addEventListener('focus', onFocus);
    return () => {
      ativo = false;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [pessoaId, lojaAtivaId, autorizacaoOk]);

  // Em "Novo cadastro", avisa se o CPF/CNPJ já existe nesta loja.
  useEffect(() => {
    if (pessoaId || !lojaAtivaId) {
      setCpfExistente(null);
      return undefined;
    }

    const digits = onlyDigits(formData.cpf);
    if (digits.length !== 11 && digits.length !== 14) {
      setCpfExistente(null);
      return undefined;
    }

    let ativo = true;
    const timer = setTimeout(async () => {
      const { data } = await getPessoaByCpfCnpj(lojaAtivaId, digits);
      if (!ativo) return;
      setCpfExistente(data ? { id: data.id, nome: data.nome || 'Cadastro existente' } : null);
    }, 350);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [pessoaId, lojaAtivaId, formData.cpf]);

  const abrirCadastroExistente = () => {
    if (!cpfExistente?.id || !onPessoaSalva) return;
    onPessoaSalva(cpfExistente.id);
  };

  const preencherEnderecoPorCep = async (cepValue) => {
    const cepLimpo = String(cepValue || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (data.erro) {
        await mostrarAviso('CEP', 'CEP não encontrado na base dos Correios.', 'warning');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        cep: cepLimpo.length === 8 ? `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}` : prev.cep,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    } catch {
      await mostrarAviso('CEP', 'Não foi possível consultar o ViaCEP agora.', 'erro');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'telefone' || name === 'telefoneAlt') {
      nextValue = formatTelefoneBr(value);
    }
    if (name === 'cpf') {
      nextValue = value; // máscara já pode vir do digitação; keep as-is unless we mask
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (name === 'cpf') {
      setDadosConsulta(null);
      setSituacaoLoja(null);
      setCpfExistente(null);
    }
    if (name === 'cep') {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 8) {
        preencherEnderecoPorCep(digits);
      }
    }
  };

  const limparFormulario = async () => {
    const confirmar = await confirm(
      'Tem certeza que deseja apagar todos os dados digitados? Esta ação não pode ser desfeita.',
      { title: 'Limpar formulário', confirmLabel: 'Sim, limpar' }
    );
    if (!confirmar) return;

    setFormData({
      cpf: '', nome: '', origem: '', inscEstadual: '', indContribuinte: '',
      inscMunicipal: '', dataNascimento: '', genero: '', telefone: '',
      telefoneAlt: '', email: '', instagram: '', cep: '', rua: '',
      numero: '', bairro: '', cidade: '', estado: '', complemento: '', observacoes: '',
      autorizaConsultaDados: false,
      autorizaConsultaEm: '',
      autorizaConsultaOrigem: '',
    });
    setDadosConsulta(null);
    setSituacaoLoja(null);
    setCpfExistente(null);
  };

  const garantirPessoaSalva = async () => {
    let payload;
    try {
      payload = mapFormToPessoa(formData, { tipoPessoa, categoria });
    } catch (err) {
      throw new Error(err.message);
    }

    if (pessoaId) {
      const { data: atual } = await getPessoaById(lojaAtivaId, pessoaId);
      const merged = mergePessoaPayloadPreservando(atual, payload);
      const { error } = await updatePessoa(lojaAtivaId, pessoaId, merged);
      if (error) throw new Error(mensagemErroPessoa(error));
      return pessoaId;
    }

    // CPF/CNPJ já cadastrado: reutiliza o registro (evita erro de unique no link WhatsApp).
    if (payload.cpf_cnpj) {
      const { data: existente, error: buscaError } = await getPessoaByCpfCnpj(
        lojaAtivaId,
        payload.cpf_cnpj
      );
      if (buscaError) throw new Error(mensagemErroPessoa(buscaError));
      if (existente?.id) {
        const merged = mergePessoaPayloadPreservando(existente, payload);
        const { error } = await updatePessoa(lojaAtivaId, existente.id, merged);
        if (error) throw new Error(mensagemErroPessoa(error));
        return existente.id;
      }
    }

    const { data, error } = await createPessoa(lojaAtivaId, payload);
    if (error) {
      // Corrida: outro cadastro no mesmo CPF entre o select e o insert.
      if (
        error.code === '23505'
        || String(error.message || '').includes('pessoas_loja_cpf_cnpj_uidx')
      ) {
        const { data: existente } = await getPessoaByCpfCnpj(lojaAtivaId, payload.cpf_cnpj);
        if (existente?.id) return existente.id;
      }
      throw new Error(mensagemErroPessoa(error));
    }
    return data.id;
  };

  const solicitarAutorizacaoCliente = async ({ abrirWhatsApp = false } = {}) => {
    if (!lojaAtivaId) {
      return mostrarAviso('Erro', 'Nenhuma loja ativa selecionada.', 'erro');
    }
    if (!formData.nome.trim()) {
      return mostrarAviso('Atenção', 'Preencha o nome antes de solicitar autorização.', 'erro');
    }
    const cpfCheck = validateCpfCnpj(formData.cpf);
    if (!cpfCheck.valid) {
      return mostrarAviso('Atenção', cpfCheck.message, 'erro');
    }
    const telefoneEnvio = formData.telefoneAlt?.trim() || formData.telefone;
    if (abrirWhatsApp && onlyDigits(telefoneEnvio).length < 10) {
      return mostrarAviso(
        'Telefone',
        'Cadastre o telefone/WhatsApp do cliente para enviar o link, ou use Copiar link.',
        'warning'
      );
    }

    setGerandoLinkAuth(true);
    try {
      const idSalvo = await garantirPessoaSalva();
      const { url, error } = await criarLinkAutorizacaoConsulta({
        lojaId: lojaAtivaId,
        pessoaId: idSalvo,
        nomeEmpresa: lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'loja',
        nomeCliente: formData.nome.trim(),
        cpfCliente: formData.cpf,
        operadorId: perfil?.id || null,
      });

      if (error || !url) {
        await mostrarAviso('Erro', error?.message || 'Não foi possível gerar o link.', 'erro');
        return;
      }

      setLinkAuthPendente(url);

      if (abrirWhatsApp) {
        const msg = montarMensagemAutorizacaoConsulta({
          nomeCliente: formData.nome.trim(),
          nomeEmpresa: lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social,
          url,
        });
        window.open(buildWhatsAppLink(telefoneEnvio, msg), '_blank', 'noopener,noreferrer');
        await mostrarAviso(
          'Link gerado',
          'O link de assinatura ficou pronto. Conclua o envio no WhatsApp se a janela abrir.\n\n' +
            'A consulta só libera depois que o cliente assinar — não depende de você ter enviado agora.',
          'info'
        );
      } else {
        await navigator.clipboard.writeText(url);
        await mostrarAviso(
          'Link copiado',
          'Cole e envie ao cliente. A consulta só libera depois da assinatura.',
          'sucesso'
        );
      }

      // Só após gerar o link: navega para edição se o cadastro acabou de ser criado.
      if (!pessoaId && onPessoaSalva) onPessoaSalva(idSalvo);
    } catch (err) {
      await mostrarAviso('Atenção', err.message || 'Não foi possível continuar.', 'erro');
    } finally {
      setGerandoLinkAuth(false);
    }
  };

  const salvarCadastro = async () => {
    if (!formData.nome.trim()) {
      return mostrarAviso('Atenção', 'O campo Nome é obrigatório!', 'erro');
    }

    if (!lojaAtivaId) {
      return mostrarAviso('Erro', 'Nenhuma loja ativa selecionada.', 'erro');
    }

    if (!isEdicao && cpfExistente?.id) {
      const ir = await confirm(
        `Já existe um cadastro com este CPF/CNPJ: ${cpfExistente.nome}.\n\nNão é possível criar outro. Deseja abrir o cadastro existente?`,
        { title: 'CPF/CNPJ já cadastrado', confirmLabel: 'Abrir cadastro', cancelLabel: 'Cancelar' }
      );
      if (ir) abrirCadastroExistente();
      return;
    }

    setSalvando(true);

    let payload;
    try {
      payload = mapFormToPessoa(formData, { tipoPessoa, categoria });
    } catch (err) {
      setSalvando(false);
      return mostrarAviso('Atenção', err.message, 'erro');
    }

    const { error } = isEdicao
      ? await updatePessoa(lojaAtivaId, pessoaId, payload)
      : await createPessoa(lojaAtivaId, payload);

    setSalvando(false);

    if (error) {
      return mostrarAviso(
        'Erro',
        mensagemErroPessoa(error),
        'erro'
      );
    }

    mostrarAviso(
      'Sucesso',
      isEdicao ? 'Cadastro atualizado com sucesso!' : 'Cadastro salvo com sucesso!',
      'sucesso',
      () => aoVoltar()
    );
  };

  const consultarCpfCnpj = async () => {
    const documentoLimpo = formData.cpf.replace(/\D/g, '');

    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
      return mostrarAviso(
        'Atenção',
        'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para consultar.',
        'erro'
      );
    }

    const validation = validateCpfCnpj(formData.cpf);
    if (!validation.valid) {
      return mostrarAviso('Atenção', validation.message, 'erro');
    }

    if (!podeConsultas) {
      return mostrarAviso(
        'Plano',
        mensagemUpgradeConsultas(lojaAtiva?.plano),
        'warning'
      );
    }

    if (documentoLimpo.length === 11 && !formData.dataNascimento) {
      return mostrarAviso(
        'Data de nascimento',
        'Para consultar CPF na Receita Federal, preencha a data de nascimento antes de consultar.',
        'warning'
      );
    }

    if (!pessoaId) {
      return mostrarAviso(
        'Autorização necessária',
        'Salve o cadastro e peça a autorização do cliente (link de assinatura) antes de consultar.',
        'warning'
      );
    }

    if (!autorizacaoOk) {
      return mostrarAviso(
        'Aguardando autorização',
        'O cliente ainda não assinou a autorização. Envie o link pelo WhatsApp ou aguarde a assinatura (termo de OS também libera).',
        'warning'
      );
    }

    const custo = custoConsultaCpfCnpj();
    const confirmar = await confirm(
      `Esta consulta consome ${custo} crédito${custo === 1 ? '' : 's'} e consulta bases públicas (Receita Federal).\n\n` +
        'Confirmo que o titular já autorizou (assinatura/termo) e que a consulta é necessária ao atendimento.',
      { title: 'Confirmar consulta', confirmLabel: 'Consultar' }
    );
    if (!confirmar) return;

    setBuscandoCpf(true);
    const result = await solicitarConsultaCpfCnpj(lojaAtivaId, formData.cpf, {
      birthdate: formData.dataNascimento,
    });
    setBuscandoCpf(false);

    if (!result.ok) {
      if (result.code === 'provider_not_configured') {
        return mostrarAviso(
          'Consulta indisponível',
          mensagemConsultaIndisponivel({ podeConsultas }),
          'warning'
        );
      }
      if (result.code === 'plan_locked') {
        return mostrarAviso(
          'Plano',
          mensagemUpgradeConsultas(lojaAtiva?.plano),
          'warning'
        );
      }
      if (result.code === 'birthdate_required') {
        return mostrarAviso(
          'Data de nascimento',
          result.error?.message || 'Informe a data de nascimento para consultar o CPF.',
          'warning'
        );
      }
      if (result.code === 'insufficient_credits') {
        return mostrarAviso(
          'Créditos insuficientes',
          result.error?.message || 'Saldo insuficiente para esta consulta.',
          'erro'
        );
      }
      return mostrarAviso(
        'Erro',
        result.error?.message || 'Não foi possível concluir a consulta.',
        'erro'
      );
    }

    const dados = result.dados || null;
    setDadosConsulta(dados);
    setSituacaoLoja(result.situacaoLoja ?? null);

    if (dados) {
      setFormData((prev) => {
        const next = { ...prev };
        if (!next.nome.trim() && dados.nome && dados.nome !== '—') {
          next.nome = dados.nome;
        }
        if (!next.dataNascimento) {
          const iso = nascimentoToInputDate(dados.nascimento);
          if (iso) next.dataNascimento = iso;
        }
        if (!next.genero) {
          const genero = mapSexoToGenero(dados.sexo);
          if (genero) next.genero = genero;
        }
        return next;
      });
    }

    if (result.situacaoLoja?.resumo) {
      await mostrarAviso('Situação na loja', result.situacaoLoja.resumo, 'info');
    }

    setAbaAtiva('consulta-cpf');
  };

  const situacaoLojaExibir = situacaoLoja || dadosConsulta?._situacaoLoja || null;

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>
            {isEdicao ? 'Editar Pessoa' : 'Cadastro de Pessoa'}
          </h2>
        </div>
      </div>

      <div style={styles.content}>
        {carregando ? (
          <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>
            Carregando cadastro...
          </div>
        ) : (
        <>
        
        <div style={styles.tabsContainer}>
          <div style={styles.tabsGroup}>
            <button style={abaAtiva === 'dados-gerais' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('dados-gerais')}>
              Dados gerais
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
                  {situacaoEhRegular(dadosConsulta?.situacao) && (
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
                    {buscandoCpf ? 'Consultando...' : 'Consultar'}
                  </button>
                </div>
                <span style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                  CPF exige data de nascimento · consome 1 crédito · plano Profissional
                </span>
                {!pessoaId && cpfExistente && (
                  <div style={styles.cpfExistenteBox}>
                    <span>
                      Já existe cadastro com este CPF/CNPJ: <strong>{cpfExistente.nome}</strong>.
                      Não é possível criar outro.
                    </span>
                    {onPessoaSalva && (
                      <button type="button" style={styles.btnAbrirExistente} onClick={abrirCadastroExistente}>
                        Abrir cadastro
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{...styles.inputGroup, gridColumn: 'span 6'}}>
                <div style={styles.authBox}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: '#e2e8f0', fontSize: '13px' }}>
                      {autorizacaoOk ? 'Autorização registrada' : 'Consulta sob autorização'}
                    </strong>
                    <p style={styles.authHint}>
                      {autorizacaoOk
                        ? `Titular autorizou${formData.autorizaConsultaOrigem ? ` (${formData.autorizaConsultaOrigem.replace(/_/g, ' ')})` : ''}. Você já pode consultar.`
                        : 'Para consultar CPF/CNPJ, o cliente assina um termo de atendimento (link) — ou o termo de OS.'}
                    </p>
                    {autorizacaoOk && evidenciaAuth && (
                      <p style={{ ...styles.authHint, color: '#94a3b8', marginTop: 6 }}>
                        Evidência
                        {evidenciaAuth.usado_em
                          ? `: ${new Date(evidenciaAuth.usado_em).toLocaleString('pt-BR')}`
                          : ''}
                        {evidenciaAuth.ip_cliente ? ` · IP ${evidenciaAuth.ip_cliente}` : ' · IP não capturado'}
                        {evidenciaAuth.cpf_informado
                          ? ` · CPF ${evidenciaAuth.cpf_informado.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')}`
                          : ''}
                      </p>
                    )}
                    {linkAuthPendente && !autorizacaoOk && (
                      <p style={{ ...styles.authHint, color: '#fbbf24', marginTop: 6 }}>
                        Link de assinatura gerado — aguardando o cliente assinar. Esta tela atualiza sozinha.
                      </p>
                    )}
                  </div>
                  {!autorizacaoOk && (
                    <div style={styles.authActions}>
                      <button
                        type="button"
                        style={styles.btnAuthWhatsApp}
                        disabled={gerandoLinkAuth}
                        onClick={() => solicitarAutorizacaoCliente({ abrirWhatsApp: true })}
                      >
                        <MessageCircle size={14} />
                        {gerandoLinkAuth ? '...' : 'WhatsApp'}
                      </button>
                      <button
                        type="button"
                        style={styles.btnAuthLink}
                        disabled={gerandoLinkAuth}
                        onClick={() => solicitarAutorizacaoCliente({ abrirWhatsApp: false })}
                      >
                        <Link2 size={14} />
                        {gerandoLinkAuth ? '...' : 'Copiar link'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isPessoaFisica && (
                <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>
                    <span style={styles.required}>*</span> Data de nascimento:
                  </label>
                  <input
                    style={styles.input}
                    type="date"
                    name="dataNascimento"
                    value={formData.dataNascimento}
                    onChange={handleChange}
                  />
                  <span style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                    Obrigatória para consulta de CPF na Receita Federal
                  </span>
                </div>
              )}
              
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

              {!isPessoaFisica && (
                <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Data de abertura:</label>
                  <input style={styles.input} type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleChange} />
                </div>
              )}
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
                <label style={styles.label}><span style={styles.required}>*</span> Telefone:</label>
                <input style={styles.input} name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Email:</label>
                <input style={styles.input} name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>WhatsApp:</label>
                <input
                  style={styles.input}
                  name="telefoneAlt"
                  value={formData.telefoneAlt}
                  onChange={handleChange}
                  placeholder="Número usado para enviar links e avisos"
                />
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
                <input
                  style={styles.input}
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  placeholder="Ex: 01001-000"
                  inputMode="numeric"
                />
                <span style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                  {buscandoCep ? 'Buscando endereço...' : 'Preenche rua, bairro, cidade e UF automaticamente'}
                </span>
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
                <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '20px'}}>Volte na aba &quot;Dados gerais&quot;, digite um CPF e clique em &quot;Consultar&quot;.</p>
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
                    {situacaoEhRegular(dadosConsulta.situacao) && (
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
                        <span style={styles.dataValue}>{dadosConsulta.cpf || dadosConsulta.cnpj || formData.cpf}</span>
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
                          <span style={styles.dotGreen}></span> {dadosConsulta.situacao}
                          {dadosConsulta.atualizadoEm && (
                            <span style={{color: '#64748b', fontWeight: 'normal', fontSize: '12px', marginLeft: '5px'}}>
                              · Atualizado em {dadosConsulta.atualizadoEm}
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{...styles.dataBlock, marginTop: '20px'}}>
                        <span style={styles.dataLabel}>PROTOCOLO DA CONSULTA</span>
                        <span style={{...styles.dataValue, color: '#64748b', fontSize: '13px', fontWeight: 'normal'}}>{dadosConsulta.protocolo}</span>
                      </div>
                      {dadosConsulta.endereco && dadosConsulta.endereco !== '—' && (
                        <div style={{...styles.dataBlock, marginTop: '20px'}}>
                          <span style={styles.dataLabel}>ENDEREÇO</span>
                          <span style={{...styles.dataValue, fontWeight: 'normal'}}>{dadosConsulta.endereco}</span>
                        </div>
                      )}
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

                {situacaoLojaExibir && (
                  <div style={{...styles.reportCard, marginTop: '20px', alignItems: 'flex-start'}}>
                    <span style={styles.cardLabel}>SITUAÇÃO NA LOJA</span>
                    <span style={{...styles.cardValue, fontWeight: 'normal', fontSize: '13px', textAlign: 'left'}}>
                      {situacaoLojaExibir.resumo || (situacaoLojaExibir.emDia
                        ? 'Em dia com a loja.'
                        : `${situacaoLojaExibir.titulosPendentes || 0} título(s) em aberto.`)}
                    </span>
                  </div>
                )}
              </>
            )}
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
        </>
        )}

      </div>

      {!carregando && (
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <button style={styles.btnPrimary} onClick={salvarCadastro} disabled={salvando}>
            <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          <button style={styles.btnDangerOutline} onClick={limparFormulario}>
            <Trash2 size={16} /> Limpar formulário
          </button>
          <button style={styles.btnBackBottom} onClick={aoVoltar}>
            <ArrowLeft size={16} /> Voltar
          </button>
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
  tabsGroup: { display: 'flex', gap: '20px', alignItems: 'center' },
  tab: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '10px 0', fontSize: '13px', cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px' },
  tabActive: { backgroundColor: 'transparent', border: 'none', color: '#38bdf8', padding: '10px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', borderBottom: '2px solid #38bdf8', display: 'flex', alignItems: 'center', gap: '6px' },
  tabFilled: { backgroundColor: '#161925', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', margin: '4px 0' },
  tabActiveFilled: { backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', margin: '4px 0' },

  formArea: { backgroundColor: 'transparent' },
  inputSelect: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '13px', outline: 'none' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#94a3b8', fontSize: '12px', fontWeight: '500' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' },
  btnActionInsideInput: { backgroundColor: '#e2e8f0', color: '#0f111a', border: 'none', padding: '0 15px', borderRadius: '0 4px 4px 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s', whiteSpace: 'nowrap' },
  authBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    backgroundColor: '#0f111a',
    border: '1px solid #2a2e3f',
    borderRadius: '8px',
    padding: '12px 14px',
  },
  authHint: { color: '#94a3b8', fontSize: '12px', lineHeight: 1.45, margin: '6px 0 0' },
  authActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  btnAuthWhatsApp: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#16a34a', color: '#fff', border: 'none',
    borderRadius: '6px', padding: '8px 12px', fontSize: '12px',
    fontWeight: 600, cursor: 'pointer',
  },
  btnAuthLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: '6px', padding: '8px 12px', fontSize: '12px',
    fontWeight: 600, cursor: 'pointer',
  },
  cpfExistenteBox: {
    marginTop: '8px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fbbf24',
    fontSize: '12px',
    lineHeight: 1.45,
  },
  btnAbrirExistente: {
    backgroundColor: '#f59e0b',
    color: '#0f111a',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  sectionDivider: { color: '#fff', fontSize: '14px', margin: '30px 0 15px 0', paddingBottom: '10px', borderBottom: '1px solid #1f2233' },

  reportBox: { backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '8px' },
  reportHeader: { padding: '15px 20px', borderBottom: '1px solid #1f2233', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badgeRegularOutline: { border: '1px solid #4ade80', color: '#4ade80', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' },
  dataBlock: { display: 'flex', flexDirection: 'column', gap: '5px' },
  dataLabel: { color: '#64748b', fontSize: '11px', fontWeight: 'bold' },
  dataValue: { color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', flexWrap: 'wrap' },
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
};

export default ClientesForm;
