import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, FileCheck } from 'lucide-react';
import AssinaturaCanvas from '../../components/AssinaturaCanvas';
import {
  confirmarAutorizacaoConsulta,
  obterAutorizacaoPorToken,
} from '../../services/autorizacaoConsultaService';
import { formatarCpfDigitacao, validarCpfAceite } from '../../domain/osEvidencias';

export default function AutorizacaoConsultaPage() {
  const { token } = useParams();
  const assinaturaRef = useRef(null);
  const [dados, setDados] = useState(null);
  const [aceito, setAceito] = useState(false);
  const [cpf, setCpf] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [concluido, setConcluido] = useState(false);

  const cpfEstado = useMemo(
    () => validarCpfAceite(cpf, dados?.cpf_cliente_cadastro),
    [cpf, dados?.cpf_cliente_cadastro]
  );

  useEffect(() => {
    if (!token) return;

    obterAutorizacaoPorToken(token).then(({ data, error }) => {
      if (error) {
        setErro(error.message ?? 'Link inválido ou expirado.');
      } else {
        setDados(data);
      }
      setCarregando(false);
    });
  }, [token]);

  const confirmar = async () => {
    setErro(null);

    if (!aceito) {
      setErro('Marque que você leu e aceita o termo.');
      return;
    }

    if (!cpf?.trim()) {
      setErro('Informe o CPF do titular para confirmar a autorização.');
      return;
    }

    if (!cpfEstado.valido) {
      setErro(cpfEstado.erro ?? 'CPF inválido.');
      return;
    }

    if (assinaturaRef.current?.isEmpty()) {
      setErro('Assine no campo abaixo usando o dedo ou caneta.');
      return;
    }

    setSalvando(true);
    const { error } = await confirmarAutorizacaoConsulta({
      token,
      assinaturaDataUrl: assinaturaRef.current.getDataUrl(),
      cpfCliente: cpfEstado.cpf,
    });
    setSalvando(false);

    if (error) {
      setErro(error.message ?? 'Não foi possível registrar a autorização.');
      return;
    }

    setConcluido(true);
  };

  if (carregando) {
    return <div style={styles.page}><p style={styles.sub}>Carregando...</p></div>;
  }

  if (erro && !dados) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.erro}>{erro}</p>
        </div>
      </div>
    );
  }

  if (concluido) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <CheckCircle size={48} color="#4ade80" style={{ marginBottom: '16px' }} />
          <h1 style={styles.title}>Autorização registrada!</h1>
          <p style={styles.sub}>
            Obrigado. A {dados?.nome_empresa} já pode dar continuidade ao seu atendimento.
            Você pode fechar esta página.
          </p>
        </div>
      </div>
    );
  }

  const bordaCpf = {
    vazio: '#2a2e3f',
    incompleto: '#2a2e3f',
    invalido: '#ef4444',
    valido: '#4ade80',
    confere: '#4ade80',
    divergente: '#f59e0b',
  }[cpfEstado.status] ?? '#2a2e3f';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <FileCheck size={22} color="#38bdf8" /> Autorização de atendimento
        </h1>
        <p style={styles.sub}>{dados?.nome_empresa}</p>
        {dados?.nome_cliente && (
          <p style={styles.nota}>Titular: <strong style={{ color: '#e2e8f0' }}>{dados.nome_cliente}</strong></p>
        )}
        <p style={styles.nota}>
          Assine no <strong>seu celular, tablet ou notebook</strong>. Seu IP e dispositivo serão registrados como evidência.
        </p>

        <pre style={styles.termo}>{dados?.termo_texto}</pre>

        <label style={styles.check}>
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
          Li e aceito o termo acima
        </label>

        <label style={styles.fieldLabel} htmlFor="cpf-autorizacao">CPF</label>
        <input
          id="cpf-autorizacao"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          style={{ ...styles.input, borderColor: bordaCpf }}
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatarCpfDigitacao(e.target.value))}
        />
        {cpfEstado.mensagem && (
          <p style={{ ...styles.msgCpf, color: cpfEstado.status === 'divergente' ? '#fbbf24' : '#94a3b8' }}>
            {cpfEstado.mensagem}
          </p>
        )}

        <span style={styles.fieldLabel}>Sua assinatura *</span>
        <AssinaturaCanvas ref={assinaturaRef} height={160} />

        {erro && <p style={styles.erro}>{erro}</p>}

        <button type="button" style={styles.btn} onClick={confirmar} disabled={salvando}>
          {salvando ? 'Registrando...' : 'Confirmar autorização'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', backgroundColor: '#0f111a', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '20px',
  },
  card: {
    width: '100%', maxWidth: '560px', backgroundColor: '#161925',
    border: '1px solid #1f2233', borderRadius: '12px', padding: '24px',
    textAlign: 'center',
  },
  title: {
    color: '#fff', fontSize: '20px', margin: '0 0 8px 0',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  sub: { color: '#94a3b8', fontSize: '14px', margin: '0 0 12px 0' },
  nota: { color: '#64748b', fontSize: '12px', margin: '0 0 12px 0', lineHeight: 1.5 },
  termo: {
    textAlign: 'left', backgroundColor: '#0b0c10', border: '1px solid #2a2e3f',
    borderRadius: '8px', padding: '14px', color: '#cbd5e1', fontSize: '12px',
    whiteSpace: 'pre-wrap', maxHeight: '280px', overflow: 'auto', marginBottom: '16px',
    fontFamily: 'inherit',
  },
  check: {
    display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0',
    fontSize: '14px', marginBottom: '16px', textAlign: 'left',
  },
  fieldLabel: {
    display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textAlign: 'left',
  },
  input: {
    width: '100%', boxSizing: 'border-box', backgroundColor: '#0b0c10',
    border: '1px solid #2a2e3f', borderRadius: '8px', padding: '12px',
    color: '#e2e8f0', fontSize: '16px', marginBottom: '8px',
  },
  msgCpf: { fontSize: '12px', textAlign: 'left', margin: '0 0 14px 0', lineHeight: 1.4 },
  btn: {
    marginTop: '16px', width: '100%', backgroundColor: '#3b82f6', color: '#fff',
    border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold',
    fontSize: '15px', cursor: 'pointer',
  },
  erro: { color: '#ef4444', fontSize: '13px', marginTop: '12px' },
};
