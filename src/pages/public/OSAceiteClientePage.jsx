import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, FileCheck } from 'lucide-react';
import AssinaturaCanvas from '../../components/AssinaturaCanvas';
import { confirmarAceiteCliente, obterAceitePorToken } from '../../services/osEvidenciaService';

export default function OSAceiteClientePage() {
  const { token } = useParams();
  const assinaturaRef = useRef(null);
  const [dados, setDados] = useState(null);
  const [aceito, setAceito] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!token) return;

    obterAceitePorToken(token).then(({ data, error }) => {
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

    if (assinaturaRef.current?.isEmpty()) {
      setErro('Assine no campo abaixo usando o dedo ou caneta.');
      return;
    }

    setSalvando(true);
    const { error } = await confirmarAceiteCliente({
      token,
      assinaturaDataUrl: assinaturaRef.current.getDataUrl(),
    });
    setSalvando(false);

    if (error) {
      setErro(error.message ?? 'Não foi possível registrar o aceite.');
      return;
    }

    setConcluido(true);
  };

  if (carregando) {
    return <div style={styles.page}><p style={styles.sub}>Carregando termo...</p></div>;
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
          <h1 style={styles.title}>Termo registrado!</h1>
          <p style={styles.sub}>
            O aceite da OS {dados?.codigo_os} foi registrado com sucesso no dispositivo {dados?.nome_empresa}.
            Você pode fechar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <FileCheck size={22} color="#38bdf8" /> Termo de entrada — {dados?.codigo_os}
        </h1>
        <p style={styles.sub}>{dados?.nome_empresa}</p>
        <p style={styles.nota}>
          Assine no <strong>seu celular, tablet ou notebook</strong>. Seu IP e dispositivo serão registrados como evidência.
        </p>

        <pre style={styles.termo}>{dados?.termo_texto}</pre>

        <label style={styles.check}>
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
          Li e aceito o termo acima
        </label>

        <span style={styles.label}>Sua assinatura *</span>
        <AssinaturaCanvas ref={assinaturaRef} height={160} />

        {erro && <p style={styles.erro}>{erro}</p>}

        <button type="button" style={styles.btn} onClick={confirmar} disabled={salvando}>
          {salvando ? 'Registrando...' : 'Confirmar aceite'}
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
  title: { color: '#fff', fontSize: '20px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  sub: { color: '#94a3b8', fontSize: '14px', margin: '0 0 16px 0' },
  nota: { color: '#64748b', fontSize: '12px', margin: '0 0 16px 0', lineHeight: 1.5 },
  termo: {
    textAlign: 'left', backgroundColor: '#0b0c10', border: '1px solid #2a2e3f',
    borderRadius: '8px', padding: '14px', color: '#cbd5e1', fontSize: '12px',
    whiteSpace: 'pre-wrap', maxHeight: '240px', overflow: 'auto', marginBottom: '16px',
    fontFamily: 'inherit',
  },
  check: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', marginBottom: '16px', textAlign: 'left' },
  label: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textAlign: 'left' },
  btn: {
    marginTop: '16px', width: '100%', backgroundColor: '#3b82f6', color: '#fff',
    border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
  },
  erro: { color: '#ef4444', fontSize: '13px', marginTop: '12px' },
};
