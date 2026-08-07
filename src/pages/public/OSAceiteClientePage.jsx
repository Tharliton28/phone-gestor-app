import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, FileCheck } from 'lucide-react';
import AssinaturaCanvas from '../../components/AssinaturaCanvas';
import ImagemLightbox from '../../components/ImagemLightbox';
import { confirmarAceiteCliente, obterAceitePorToken } from '../../services/osEvidenciaService';
import { formatarCpfDigitacao, validarCpfAceite } from '../../domain/osEvidencias';
import { onlyDigits } from '../../utils/formatters';

const TITULOS = {
  entrada: 'Termo de entrada',
  saida: 'Termo de saída',
};

const LEGENDA_FOTOS = {
  entrada: 'Estado do aparelho na entrada, registrado pela loja',
  saida: 'Estado do aparelho na retirada, registrado pela loja',
};

export default function OSAceiteClientePage() {
  const { token } = useParams();
  const assinaturaRef = useRef(null);
  const [dados, setDados] = useState(null);
  const [aceito, setAceito] = useState(false);
  const [cpf, setCpf] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [concluido, setConcluido] = useState(false);
  const [visualizador, setVisualizador] = useState(null);

  const tituloTermo = TITULOS[dados?.tipo] ?? TITULOS.entrada;
  const legendaFotos = LEGENDA_FOTOS[dados?.tipo] ?? LEGENDA_FOTOS.entrada;
  const fotos = dados?.fotos ?? [];

  const cpfEstado = useMemo(
    () => validarCpfAceite(cpf, dados?.cpf_cliente_cadastro, {
      // Mesmo rigor do link de autorização: CPF obrigatório e igual ao cadastro (PF).
      exigirIgualCadastro: true,
      rotuloCadastro: 'cadastro da OS',
    }),
    [cpf, dados?.cpf_cliente_cadastro]
  );

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

    if (!cpfEstado.valido) {
      setErro(cpfEstado.erro ?? 'CPF inválido.');
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
      cpfCliente: cpfEstado.cpf,
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
            O aceite da OS {dados?.codigo_os} foi registrado com sucesso na {dados?.nome_empresa}.
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

  const corMsgCpf = {
    invalido: '#ef4444',
    incompleto: '#94a3b8',
    valido: '#4ade80',
    confere: '#4ade80',
    divergente: '#fbbf24',
  }[cpfEstado.status] ?? '#94a3b8';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <FileCheck size={22} color="#38bdf8" /> {tituloTermo} — {dados?.codigo_os}
        </h1>
        <p style={styles.sub}>{dados?.nome_empresa}</p>
        <p style={styles.nota}>
          Assine no <strong>seu celular, tablet ou notebook</strong>. Seu IP e dispositivo serão registrados como evidência.
        </p>

        <pre style={styles.termo}>{dados?.termo_texto}</pre>

        {fotos.length > 0 ? (
          <div style={styles.blocoFotos}>
            <span style={styles.fieldLabel}>Fotos do aparelho ({fotos.length})</span>
            <p style={styles.legendaFotos}>{legendaFotos} · toque para ampliar e dar zoom</p>
            <div style={styles.gridFotos}>
              {fotos.map((foto, i) => (
                <img
                  key={foto.id}
                  src={foto.url}
                  alt={foto.nome}
                  style={styles.thumb}
                  onClick={() => setVisualizador(i)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p style={styles.semFotos}>
            A loja não anexou fotos a este termo. Confira o aparelho pessoalmente antes de assinar.
          </p>
        )}

        <label style={styles.check}>
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
          {fotos.length > 0
            ? 'Li o termo, conferi as fotos acima e aceito'
            : 'Li e aceito o termo acima'}
        </label>

        <label style={styles.fieldLabel} htmlFor="cpf-aceite">CPF</label>
        <input
          id="cpf-aceite"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={14}
          style={{ ...styles.input, borderColor: bordaCpf, marginBottom: cpfEstado.mensagem ? '6px' : '16px' }}
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatarCpfDigitacao(e.target.value))}
        />
        {cpfEstado.mensagem && (
          <p style={{ ...styles.msgCpf, color: corMsgCpf }}>{cpfEstado.mensagem}</p>
        )}
        {dados?.cliente_tem_cpf === false && (
          <p style={styles.ajudaCpf}>Informe o CPF do titular. Sem CPF no cadastro da OS, qualquer CPF válido será aceito — prefira cadastrar o cliente antes.</p>
        )}
        {onlyDigits(dados?.cpf_cliente_cadastro).length === 11 && (
          <p style={styles.ajudaCpf}>O CPF precisa ser o mesmo do cliente cadastrado nesta OS.</p>
        )}

        <span style={styles.fieldLabel}>Sua assinatura *</span>
        <AssinaturaCanvas ref={assinaturaRef} height={160} />

        {erro && <p style={styles.erro}>{erro}</p>}

        <button type="button" style={styles.btn} onClick={confirmar} disabled={salvando}>
          {salvando ? 'Registrando...' : 'Confirmar aceite'}
        </button>
      </div>

      {visualizador !== null && (
        <ImagemLightbox
          fotos={fotos}
          indiceInicial={visualizador}
          onFechar={() => setVisualizador(null)}
        />
      )}
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
  blocoFotos: { marginBottom: '16px' },
  legendaFotos: { color: '#64748b', fontSize: '11px', margin: '0 0 10px 0', textAlign: 'left', lineHeight: 1.5 },
  gridFotos: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start' },
  thumb: {
    width: '84px', height: '84px', objectFit: 'cover', borderRadius: '8px',
    border: '1px solid #2a2e3f', cursor: 'zoom-in',
  },
  semFotos: {
    color: '#fbbf24', fontSize: '12px', textAlign: 'left', lineHeight: 1.5,
    marginBottom: '16px', padding: '10px 12px', borderRadius: '8px',
    backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)',
  },
  fieldLabel: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textAlign: 'left' },
  input: {
    width: '100%', boxSizing: 'border-box', backgroundColor: '#0b0c10', border: '1px solid #2a2e3f',
    borderRadius: '8px', padding: '12px', color: '#e2e8f0', fontSize: '16px', letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  msgCpf: { fontSize: '12px', textAlign: 'left', margin: '0 0 14px 0', lineHeight: 1.4 },
  ajudaCpf: { color: '#64748b', fontSize: '11px', textAlign: 'left', margin: '0 0 16px 0', lineHeight: 1.4 },
  btn: {
    marginTop: '16px', width: '100%', backgroundColor: '#3b82f6', color: '#fff',
    border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
  },
  erro: { color: '#ef4444', fontSize: '13px', marginTop: '12px' },
};
