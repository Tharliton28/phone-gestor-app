import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Smartphone, AlertCircle, DollarSign, Wrench } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { listPessoasResumo } from '../services/pessoaService';
import { formatBRL, parseMoney } from '../utils/formatters';
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
  const { lojaAtivaId, perfil } = useLoja();
  const { alert } = useDialog();
  const isEdicao = Boolean(osId);
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [somenteLeitura, setSomenteLeitura] = useState(false);
  const [codigo, setCodigo] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!lojaAtivaId) return;

    Promise.all([
      listPessoasResumo(lojaAtivaId, { categoria: 'cliente' }),
      listPessoasResumo(lojaAtivaId, { categoria: 'tecnico' }),
    ]).then(([clientesResult, tecnicosResult]) => {
      if (!clientesResult.error && clientesResult.data?.length) {
        setClientes(clientesResult.data);
      } else {
        listPessoasResumo(lojaAtivaId).then(({ data }) => setClientes(data ?? []));
      }
      if (!tecnicosResult.error) setTecnicos(tecnicosResult.data ?? []);
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
    const { error } = isEdicao
      ? await updateOrdemServico(lojaAtivaId, osId, form)
      : await createOrdemServico(lojaAtivaId, form, perfil?.id);
    setSalvando(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível salvar a OS.', { type: 'error', title: 'Erro' });
      return;
    }

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
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>
            {isEdicao ? `Editar OS ${codigo ?? ''}` : 'Abertura de Ordem de Serviço'}
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
            {isEdicao && (
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
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { color: '#94a3b8', fontSize: '12px' },
  input: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px', color: '#fff', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnSave: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
};

export default OSForm;
