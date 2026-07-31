import React, { useEffect, useRef, useState } from 'react';
import { Camera, UploadCloud } from 'lucide-react';
import { uploadFotos } from '../services/osEvidenciaService';
import { criarPreviewPendente, revogarPreviewPendente } from '../utils/fotoPreview';
import ImagemLightbox from './ImagemLightbox';

const SEM_PENDENCIA = { ok: true, salvas: 0, error: null, osId: null };

/**
 * Única porta de entrada para evidência fotográfica de OS (entrada, durante o reparo, saída).
 * Fotos são ato do operador: nunca dependem do cliente, só de a OS já ter id.
 */
export default function OSFotosUpload({
  lojaId,
  osId,
  momento,
  operadorId,
  titulo,
  ator,
  ajuda,
  obrigatorio = false,
  somenteLeitura = false,
  fotosSalvas = [],
  apiRef,
  onSalvou,
}) {
  const [pendentes, setPendentes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [visualizador, setVisualizador] = useState(null);

  const pendentesRef = useRef([]);

  useEffect(() => {
    pendentesRef.current = pendentes;
  }, [pendentes]);

  const descartarPendentes = () => {
    setPendentes((prev) => {
      prev.forEach(revogarPreviewPendente);
      return [];
    });
  };

  const persistir = async (osIdAlvo) => {
    const alvo = osIdAlvo ?? osId;
    const itens = pendentesRef.current;

    if (!lojaId || !alvo || itens.length === 0) return SEM_PENDENCIA;

    const arquivos = itens.map((item) => item.file);
    const { error, salvas } = await uploadFotos(lojaId, alvo, arquivos, momento, operadorId);

    if (error && !salvas) return { ok: false, salvas: 0, error, osId: alvo };

    descartarPendentes();
    return { ok: true, salvas: salvas ?? arquivos.length, error: error ?? null, osId: alvo };
  };

  // Sem deps: republica a cada render para o formulário da OS sempre chamar closures atuais.
  useEffect(() => {
    if (!apiRef) return undefined;

    apiRef.current = {
      temFotosPendentes: () => pendentesRef.current.length > 0,
      flushFotosPendentes: async (osIdNovo) => {
        const upload = await persistir(osIdNovo);

        if (!upload.ok) {
          setErro(upload.error?.message ?? 'Erro ao enviar fotos.');
          return upload;
        }

        if (upload.salvas > 0) {
          setSucesso(`${upload.salvas} foto(s) enviada(s).`);
          // Recarrega com o id explícito: a OS pode ter acabado de ser criada.
          await onSalvou?.(upload.osId);
        }

        return upload;
      },
    };

    return () => {
      apiRef.current = null;
    };
  });

  useEffect(() => () => {
    pendentesRef.current.forEach(revogarPreviewPendente);
  }, []);

  // Evidência não enviada é perda irreversível: avisa antes de fechar a aba.
  useEffect(() => {
    if (pendentes.length === 0) return undefined;

    const avisar = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendentes.length]);

  const adicionar = (event) => {
    const arquivos = [...(event.target.files ?? [])];
    if (!arquivos.length) return;

    setPendentes((prev) => [...prev, ...arquivos.map(criarPreviewPendente)]);
    setSucesso(null);
    event.target.value = '';
  };

  const remover = (id) => {
    setPendentes((prev) => {
      revogarPreviewPendente(prev.find((item) => item.id === id));
      return prev.filter((item) => item.id !== id);
    });
  };

  const salvar = async () => {
    if (!pendentes.length) return;

    setEnviando(true);
    setErro(null);
    setSucesso(null);

    const upload = await persistir();
    setEnviando(false);

    if (!upload.ok) {
      setErro(upload.error?.message ?? 'Erro ao enviar fotos.');
      return;
    }

    setSucesso(
      upload.error
        ? `${upload.salvas} foto(s) salva(s). ${upload.error.message}`
        : `${upload.salvas} foto(s) salva(s) com sucesso.`
    );

    await onSalvou?.(upload.osId);
  };

  const abrirSalvas = (posicao) => setVisualizador({ fotos: fotosSalvas, indiceInicial: posicao });

  const abrirPendentes = (id) => {
    const visiveis = pendentes
      .filter((item) => item.previewUrl)
      .map((item) => ({ id: item.id, url: item.previewUrl, nome: item.nome }));
    const posicao = visiveis.findIndex((item) => item.id === id);
    if (posicao >= 0) setVisualizador({ fotos: visiveis, indiceInicial: posicao });
  };

  const lightbox = visualizador && (
    <ImagemLightbox
      fotos={visualizador.fotos}
      indiceInicial={visualizador.indiceInicial}
      onFechar={() => setVisualizador(null)}
    />
  );

  if (somenteLeitura) {
    return (
      <div style={styles.bloco}>
        <span style={styles.label}>
          {titulo}
          {ator ? <span style={styles.ator}>{ator}</span> : null}
        </span>
        {fotosSalvas.length > 0 ? (
          <div style={styles.grid}>
            {fotosSalvas.map((foto, i) => (
              <img
                key={foto.id}
                src={foto.url}
                alt={titulo}
                style={styles.thumbClicavel}
                title="Clique para ampliar"
                onClick={() => abrirSalvas(i)}
              />
            ))}
          </div>
        ) : (
          <p style={styles.vazio}>Nenhuma foto registrada.</p>
        )}
        {lightbox}
      </div>
    );
  }

  return (
    <div style={styles.bloco}>
      <span style={styles.label}>
        {titulo} {obrigatorio ? '*' : ''}
        {ator ? <span style={styles.ator}>{ator}</span> : null}
      </span>

      {ajuda && <p style={styles.ajuda}>{ajuda}</p>}

      {pendentes.length > 0 && (
        <p style={styles.avisoPendente}>
          {pendentes.length} foto(s) selecionada(s), ainda não enviada(s)
          {osId ? ' — clique no botão abaixo ou salve a OS.' : ' — serão enviadas automaticamente ao salvar a OS.'}
        </p>
      )}

      <label style={styles.btnUpload}>
        <Camera size={14} /> Adicionar fotos
        <input type="file" accept="image/*" capture="environment" multiple hidden onChange={adicionar} />
      </label>

      {pendentes.length > 0 && (
        <div style={styles.grid}>
          {pendentes.map((item) => (
            <div key={item.id} style={styles.wrap}>
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.nome}
                  style={styles.thumbClicavel}
                  title="Clique para ampliar"
                  onClick={() => abrirPendentes(item.id)}
                />
              ) : (
                <div style={styles.placeholder} title={item.nome}>
                  <Camera size={20} color="#64748b" />
                  <span style={styles.placeholderTipo}>HEIC</span>
                  <span style={styles.placeholderNome}>{item.nome}</span>
                </div>
              )}
              <button type="button" style={styles.remover} onClick={() => remover(item.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {osId && pendentes.length > 0 && (
        <button
          type="button"
          style={{ ...styles.btnSalvar, ...(enviando ? styles.btnSalvarEnviando : null) }}
          onClick={salvar}
          disabled={enviando}
        >
          <UploadCloud size={16} />
          {enviando ? 'Enviando fotos...' : `Salvar ${pendentes.length} foto(s)`}
        </button>
      )}

      {fotosSalvas.length > 0 && (
        <>
          <span style={{ ...styles.label, marginTop: '14px' }}>
            Fotos já salvas ({fotosSalvas.length})
            <span style={styles.ator}>clique para ampliar</span>
          </span>
          <div style={styles.grid}>
            {fotosSalvas.map((foto, i) => (
              <img
                key={foto.id}
                src={foto.url}
                alt={titulo}
                style={styles.thumbClicavel}
                title="Clique para ampliar"
                onClick={() => abrirSalvas(i)}
              />
            ))}
          </div>
        </>
      )}

      {sucesso && <p style={styles.sucesso}>{sucesso}</p>}
      {erro && <p style={styles.erro}>{erro}</p>}
      {lightbox}
    </div>
  );
}

const styles = {
  bloco: { marginBottom: '20px' },
  label: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' },
  ator: { marginLeft: '8px', color: '#64748b', fontSize: '11px', fontStyle: 'italic' },
  ajuda: { color: '#64748b', fontSize: '11px', margin: '0 0 10px 0', lineHeight: 1.5 },
  avisoPendente: {
    color: '#fbbf24', fontSize: '12px', margin: '0 0 10px 0', padding: '8px 10px',
    backgroundColor: 'rgba(251, 191, 36, 0.08)', borderRadius: '6px',
    border: '1px solid rgba(251, 191, 36, 0.25)',
  },
  btnUpload: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0f111a',
    border: '1px dashed #2a2e3f', color: '#38bdf8', padding: '10px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px',
  },
  btnSalvar: {
    marginTop: '12px', backgroundColor: '#f59e0b', color: '#1a1205', border: 'none',
    padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.18)',
  },
  btnSalvarEnviando: {
    backgroundColor: '#7c5310', color: '#fde9c2', cursor: 'wait', boxShadow: 'none',
  },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' },
  wrap: { position: 'relative' },
  thumbClicavel: {
    width: '88px', height: '88px', objectFit: 'cover', borderRadius: '6px',
    border: '1px solid #2a2e3f', cursor: 'zoom-in',
  },
  placeholder: {
    width: '88px', height: '88px', borderRadius: '6px', border: '1px solid #2a2e3f',
    backgroundColor: '#0f111a', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '2px', padding: '4px', boxSizing: 'border-box',
  },
  placeholderTipo: { color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' },
  placeholderNome: {
    color: '#64748b', fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', maxWidth: '80px',
  },
  remover: {
    position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
    borderRadius: '50%', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
  },
  vazio: { color: '#64748b', fontSize: '12px', margin: 0 },
  sucesso: { color: '#4ade80', fontSize: '12px', marginTop: '10px' },
  erro: { color: '#ef4444', fontSize: '12px', marginTop: '10px' },
};
