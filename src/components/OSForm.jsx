import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArrowLeft, Save, User, Smartphone, AlertCircle, DollarSign, Wrench } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { listPessoasResumo } from '../services/pessoaService';
import { formatBRL, parseMoney } from '../utils/formatters';
import { getLojaConfigAssistencia, mapConfigOs } from '../services/lojaConfigService';
import OSTermoEntrada from './OSTermoEntrada';
import OSFotosUpload from './OSFotosUpload';
import { listFotosComUrl, MOMENTO_FOTO } from '../services/osEvidenciaService';
import {
  createOrdemServico,
  getOrdemServicoById,
  mapOrdemServicoToForm,
  STATUS_LABEL,
  updateOrdemServico,
} from '../services/osService';

const EMPTY_FORM = {
  clienteId: '',
  tecnicoId: '',
  aparelhoModelo: '',
  aparelhoImei: '',
  aparelhoCorAcessorios: '',
  estadoFisico: '',
  relatoCliente: '',
  laudoTecnico: '',
  valorServico: '',
  valorPecas: '0',
  dataPrevisao: '',
  observacoes: '',
  status: 'aberta',
};

const OSForm = ({ aoVoltar, osId = null }) => {
  const { lojaAtivaId, lojaAtiva, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const isEdicao = Boolean(osId);
  const [osIdLocal, setOsIdLocal] = useState(null);
  const osIdEfetivo = osId ?? osIdLocal;
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [somenteLeitura, setSomenteLeitura] = useState(false);
  const [codigo, setCodigo] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [configOs, setConfigOs] = useState(mapConfigOs(null));
  const termoEntradaApi = useRef(null);
  const termoSaidaApi = useRef(null);
  const fotosReparoApi = useRef(null);
  const sequenciaReparoRef = useRef(0);
  const [fotosReparo, setFotosReparo] = useState([]);
  const [avisoReparo, setAvisoReparo] = useState(null);

  useEffect(() => {
    if (!lojaAtivaId) return;

    Promise.all([
      listPessoasResumo(lojaAtivaId, { categoria: 'cliente' }),
      listPessoasResumo(lojaAtivaId, { categoria: 'tecnico' }),
      getLojaConfigAssistencia(lojaAtivaId),
    ]).then(([clientesResult, tecnicosResult, configResult]) => {
      if (!clientesResult.error && clientesResult.data?.length) {
        setClientes(clientesResult.data);
      } else {
        listPessoasResumo(lojaAtivaId).then(({ data }) => setClientes(data ?? []));
      }
      if (!tecnicosResult.error) setTecnicos(tecnicosResult.data ?? []);
      if (!configResult.error && configResult.data) {
        setConfigOs(mapConfigOs(configResult.data));
      }
    });
  }, [lojaAtivaId]);

  useEffect(() => {
    if (!osId || !lojaAtivaId) return;

    const carregar = async () => {
      setCarregando(true);
      const { data, error } = await getOrdemServicoById(lojaAtivaId, osId);

      if (error || !data) {
        await alert(error?.message ?? 'Não foi possível carregar a OS.', { type: 'error', title: 'Erro' });
        aoVoltar();
        return;
      }

      setCodigo(data.codigo);
      setSomenteLeitura(['finalizada', 'cancelada'].includes(data.status));
      setForm(mapOrdemServicoToForm(data));
      setCarregando(false);
    };

    carregar();
  }, [osId, lojaAtivaId, aoVoltar, alert]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const valorTotal =
    parseMoney(form.valorServico) + parseMoney(form.valorPecas);

  const clienteNome = useMemo(
    () => clientes.find((c) => c.id === form.clienteId)?.nome ?? '',
    [clientes, form.clienteId]
  );

  // WhatsApp dedicado (telefone_alternativo) tem prioridade sobre o telefone principal.
  const clienteTelefone = useMemo(() => {
    const cliente = clientes.find((c) => c.id === form.clienteId);
    return cliente?.telefone_alternativo || cliente?.telefone || '';
  }, [clientes, form.clienteId]);

  // Saída só faz sentido na retirada. Em "aberta" ainda é entrada; cancelada não coleta.
  // Em "finalizada" ainda permite coletar se o termo de saída não foi assinado.
  const mostrarTermoSaida = Boolean(osIdEfetivo) && !['aberta', 'cancelada'].includes(form.status);
  const coletaEvidenciaBloqueada = form.status === 'cancelada';

  const nomeEmpresa = lojaAtiva?.nome_fantasia ?? lojaAtiva?.razao_social ?? 'Loja';
  const cnpjEmpresa = lojaAtiva?.cnpj ?? '';

  const carregarFotosReparo = useCallback(async (osIdAlvo = null) => {
    const alvo = osIdAlvo ?? osIdEfetivo;
    if (!lojaAtivaId || !alvo) return;

    const sequencia = sequenciaReparoRef.current + 1;
    sequenciaReparoRef.current = sequencia;

    const { fotos, error } = await listFotosComUrl(lojaAtivaId, alvo, MOMENTO_FOTO.DURANTE);

    // Descarta resposta obsoleta para não sobrescrever a lista recém-atualizada.
    if (sequencia !== sequenciaReparoRef.current) return;

    if (error) {
      setAvisoReparo('Fotos do reparo indisponíveis: rode a migration 018 no Supabase.');
      setFotosReparo([]);
      return;
    }

    setAvisoReparo(null);
    setFotosReparo(fotos);
  }, [lojaAtivaId, osIdEfetivo]);

  useEffect(() => {
    carregarFotosReparo();
  }, [carregarFotosReparo]);

  /** Sobe as fotos que o operador já selecionou, agora que a OS tem id. */
  const enviarFotosPendentes = async (osIdAlvo) => {
    const apis = [termoEntradaApi.current, termoSaidaApi.current, fotosReparoApi.current].filter(Boolean);
    let salvas = 0;
    let mensagemErro = null;

    for (const api of apis) {
      if (!api.temFotosPendentes()) continue;

      const upload = await api.flushFotosPendentes(osIdAlvo);
      salvas += upload.salvas ?? 0;

      if (!upload.ok && !mensagemErro) {
        mensagemErro = upload.error?.message ?? 'erro no envio das fotos.';
      }
    }

    return { salvas, falhou: Boolean(mensagemErro), mensagemErro };
  };

  /** Evidência selecionada e não enviada é perda irreversível: confirma antes de descartar. */
  const voltarComGuarda = async () => {
    const temPendentes = [termoEntradaApi, termoSaidaApi, fotosReparoApi]
      .some((ref) => ref.current?.temFotosPendentes());

    if (temPendentes) {
      const sair = await confirm(
        'Há fotos selecionadas que ainda não foram enviadas. Se sair agora, elas serão perdidas.',
        { title: 'Fotos não enviadas', confirmLabel: 'Sair sem enviar', confirmVariant: 'danger' }
      );
      if (!sair) return;
    }

    aoVoltar();
  };

  const salvar = async () => {
    if (!lojaAtivaId) return;

    if (!form.clienteId) {
      await alert('Selecione o cliente.', { type: 'warning', title: 'Campo obrigatório' });
      return;
    }
    if (!form.aparelhoModelo.trim()) {
      await alert('Informe o modelo do aparelho.', { type: 'warning', title: 'Campo obrigatório' });
      return;
    }

    setSalvando(true);
    const result = isEdicao || osIdLocal
      ? await updateOrdemServico(lojaAtivaId, osIdEfetivo, form)
      : await createOrdemServico(lojaAtivaId, form, perfil?.id);
    setSalvando(false);

    if (result.error) {
      await alert(result.error.message ?? 'Não foi possível salvar a OS.', { type: 'error', title: 'Erro' });
      return;
    }

    if (!isEdicao && !osIdLocal && result.data) {
      setOsIdLocal(result.data.id);
      setCodigo(result.data.codigo);

      const upload = await enviarFotosPendentes(result.data.id);

      if (upload.falhou) {
        await alert(
          `OS ${result.data.codigo} criada, mas as fotos não foram enviadas: ${upload.mensagemErro}`,
          { type: 'error', title: 'Fotos não enviadas' }
        );
        return;
      }

      await alert(
        upload.salvas > 0
          ? `OS ${result.data.codigo} criada e ${upload.salvas} foto(s) enviada(s). Colete agora a assinatura do cliente na seção abaixo.`
          : `OS ${result.data.codigo} criada. Registre as fotos e colete a assinatura do cliente na seção abaixo.`,
        { type: 'success', title: 'OS salva' }
      );
      return;
    }

    const upload = await enviarFotosPendentes(osIdEfetivo);

    if (upload.falhou) {
      await alert(
        `OS salva, mas as fotos não foram enviadas: ${upload.mensagemErro}`,
        { type: 'error', title: 'Fotos não enviadas' }
      );
      return;
    }

    await alert(
      upload.salvas > 0
        ? `OS salva e ${upload.salvas} foto(s) enviada(s).`
        : 'OS salva com sucesso!',
      { type: 'success', title: 'Sucesso' }
    );
    aoVoltar();
  };

  if (carregando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        Carregando ordem de serviço...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={voltarComGuarda} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>
            {isEdicao ? `Editar OS ${codigo ?? ''}` : osIdLocal ? `OS ${codigo ?? ''} — Termo de entrada` : 'Abertura de Ordem de Serviço'}
          </h2>
        </div>
        {somenteLeitura && (
          <span style={styles.readonlyBadge}>Somente leitura — OS encerrada</span>
        )}
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <h3 style={styles.secTitle}><User size={16} color="#38bdf8" /> Dados do Cliente</h3>
          <div style={styles.grid2}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cliente *</label>
              <select
                name="clienteId"
                style={styles.input}
                value={form.clienteId}
                onChange={handleChange}
                disabled={somenteLeitura}
              >
                <option value="">Selecione...</option>
                {clientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Técnico responsável</label>
              <select
                name="tecnicoId"
                style={styles.input}
                value={form.tecnicoId}
                onChange={handleChange}
                disabled={somenteLeitura}
              >
                <option value="">Selecione...</option>
                {tecnicos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.secTitle}><Smartphone size={16} color="#38bdf8" /> Dados do Equipamento</h3>
          <div style={styles.grid3}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Modelo / Marca *</label>
              <input
                name="aparelhoModelo"
                style={styles.input}
                placeholder="Ex: iPhone 14 Plus"
                value={form.aparelhoModelo}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>IMEI / Serial</label>
              <input
                name="aparelhoImei"
                style={styles.input}
                value={form.aparelhoImei}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cor / Acessórios entregues</label>
              <input
                name="aparelhoCorAcessorios"
                style={styles.input}
                value={form.aparelhoCorAcessorios}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <label style={styles.label}>Estado físico (arranhões, trincos, etc.)</label>
            <textarea
              name="estadoFisico"
              style={{ ...styles.input, height: '60px', resize: 'none' }}
              value={form.estadoFisico}
              onChange={handleChange}
              disabled={somenteLeitura}
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.secTitle}><AlertCircle size={16} color="#fbbf24" /> Defeito e Laudo Técnico</h3>
          <div style={styles.grid2}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Relato do cliente</label>
              <textarea
                name="relatoCliente"
                style={{ ...styles.input, height: '80px', resize: 'none' }}
                placeholder="Ex: Celular caiu na água e não liga..."
                value={form.relatoCliente}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Laudo técnico / observações internas</label>
              <textarea
                name="laudoTecnico"
                style={{ ...styles.input, height: '80px', resize: 'none' }}
                placeholder="Restrito ao técnico..."
                value={form.laudoTecnico}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.secTitle}><Wrench size={16} color="#4ade80" /> Valores e Prazo</h3>
          <div style={styles.grid3}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Valor do serviço (R$)</label>
              <input
                name="valorServico"
                style={styles.input}
                placeholder="0,00"
                value={form.valorServico}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Previsão de entrega</label>
              <input
                type="date"
                name="dataPrevisao"
                style={styles.input}
                value={form.dataPrevisao}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            {(isEdicao || osIdLocal) && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Status</label>
                <select
                  name="status"
                  style={styles.input}
                  value={form.status}
                  onChange={handleChange}
                  disabled={somenteLeitura}
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <OSTermoEntrada
          lojaId={lojaAtivaId}
          osId={osIdEfetivo}
          codigo={codigo}
          form={form}
          clienteNome={clienteNome}
          clienteTelefone={clienteTelefone}
          nomeEmpresa={nomeEmpresa}
          cnpjEmpresa={cnpjEmpresa}
          termoTemplate={configOs.termoOS}
          exigirTermo={configOs.exigirTermoEntrada}
          exigirFoto={configOs.exigirFotoEntrada}
          somenteLeitura={coletaEvidenciaBloqueada}
          operadorId={perfil?.id}
          tipo="entrada"
          apiRef={termoEntradaApi}
        />

        {osIdEfetivo && form.status === 'aberta' && (
          <p style={styles.avisoSaida}>
            Termo de saída (link com IP do cliente na retirada): aparece quando o status sair de Aberta
            — por exemplo Em Manutenção ou ao preparar a entrega.
          </p>
        )}

        {osIdEfetivo && (
          <div style={styles.section}>
            <h3 style={styles.secTitle}><Wrench size={16} color="#f59e0b" /> Fotos do reparo</h3>
            {avisoReparo ? (
              <p style={styles.avisoReparo}>{avisoReparo}</p>
            ) : (
              <OSFotosUpload
                lojaId={lojaAtivaId}
                osId={osIdEfetivo}
                momento={MOMENTO_FOTO.DURANTE}
                operadorId={perfil?.id}
                titulo="Evidências técnicas da execução"
                ator="uso interno da loja"
                ajuda="Placa aberta, oxidação, componente queimado, peça substituída. Não aparecem no termo do cliente: servem para defender o laudo da loja em contestação técnica."
                somenteLeitura={coletaEvidenciaBloqueada}
                fotosSalvas={fotosReparo}
                apiRef={fotosReparoApi}
                onSalvou={carregarFotosReparo}
              />
            )}
          </div>
        )}

        {mostrarTermoSaida && (
          <OSTermoEntrada
            lojaId={lojaAtivaId}
            osId={osIdEfetivo}
            codigo={codigo}
            form={form}
            clienteNome={clienteNome}
            clienteTelefone={clienteTelefone}
            nomeEmpresa={nomeEmpresa}
            cnpjEmpresa={cnpjEmpresa}
            termoTemplate={configOs.termoOSSaida}
            exigirTermo={configOs.exigirTermoSaida}
            exigirFoto={configOs.exigirFotoSaida}
            somenteLeitura={coletaEvidenciaBloqueada}
            operadorId={perfil?.id}
            tipo="saida"
            apiRef={termoSaidaApi}
          />
        )}
      </div>

      <div style={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={20} color="#4ade80" />
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
            Total: R$ {formatBRL(valorTotal)}
          </span>
        </div>
        {!somenteLeitura && (
          <button style={styles.btnSave} onClick={salvar} disabled={salvando}>
            <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar OS'}
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh' },
  header: { padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  readonlyBadge: { color: '#fbbf24', fontSize: '12px', fontWeight: '600' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  content: { padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  secTitle: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', marginBottom: '15px', marginTop: 0 },
  avisoReparo: { color: '#fbbf24', fontSize: '12px', margin: 0 },
  avisoSaida: {
    color: '#94a3b8', fontSize: '12px', margin: '0 0 16px 0', padding: '10px 12px',
    backgroundColor: '#161925', border: '1px dashed #2a2e3f', borderRadius: '8px', lineHeight: 1.5,
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { color: '#94a3b8', fontSize: '12px' },
  input: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px', color: '#fff', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnSave: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
};

export default OSForm;
