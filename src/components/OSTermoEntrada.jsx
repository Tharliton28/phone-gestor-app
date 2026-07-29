import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileCheck, Camera, Eraser, ShieldCheck } from 'lucide-react';
import AssinaturaCanvas from './AssinaturaCanvas';
import {
  getOsEvidenciasEntrada,
  registrarTermoEntrada,
  substituirVariaveisTermo,
  TERMO_OS_PADRAO,
  uploadFotosEntrada,
} from '../services/osEvidenciaService';

export default function OSTermoEntrada({
  lojaId,
  osId,
  codigo,
  form,
  clienteNome,
  nomeEmpresa = 'Loja',
  termoTemplate,
  exigirTermo = true,
  exigirFoto = true,
  somenteLeitura = false,
  operadorId,
  onRegistrado,
}) {
  const assinaturaRef = useRef(null);
  const [aceito, setAceito] = useState(false);
  const [fotosPendentes, setFotosPendentes] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [evidencias, setEvidencias] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(osId));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const termoRenderizado = useMemo(() => {
    const template = termoTemplate?.trim() || TERMO_OS_PADRAO;
    return substituirVariaveisTermo(template, {
      nomeEmpresa,
      nomeCliente: clienteNome ?? '—',
      codigoOs: codigo ?? '—',
      modeloAparelho: form?.aparelhoModelo ?? '—',
      imei: form?.aparelhoImei ?? '—',
      dataEntrada: new Date().toLocaleDateString('pt-BR'),
    });
  }, [termoTemplate, nomeEmpresa, clienteNome, codigo, form?.aparelhoModelo, form?.aparelhoImei]);

  const carregar = useCallback(async () => {
    if (!lojaId || !osId) return;

    setCarregando(true);
    const { termo, fotos, assinaturaUrl, error } = await getOsEvidenciasEntrada(lojaId, osId);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar evidências.');
    } else {
      setEvidencias({ termo, fotos, assinaturaUrl });
    }

    setCarregando(false);
  }, [lojaId, osId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFotos = (e) => {
    const files = [...(e.target.files ?? [])];
    if (!files.length) return;

    setFotosPendentes((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removerFoto = (index) => {
    setFotosPendentes((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const registrar = async () => {
    if (!lojaId || !osId) return;

    setErro(null);

    if (exigirTermo && !aceito) {
      setErro('O cliente precisa aceitar o termo de entrada.');
      return;
    }

    if (exigirTermo && assinaturaRef.current?.isEmpty()) {
      setErro('Capture a assinatura do cliente.');
      return;
    }

    if (exigirFoto && fotosPendentes.length === 0) {
      setErro('Adicione ao menos uma foto do aparelho na entrada.');
      return;
    }

    setSalvando(true);

    if (fotosPendentes.length) {
      const { error: fotosError } = await uploadFotosEntrada(lojaId, osId, fotosPendentes, operadorId);
      if (fotosError) {
        setSalvando(false);
        setErro(fotosError.message ?? 'Erro ao enviar fotos.');
        return;
      }
    }

    const { error: termoError } = await registrarTermoEntrada({
      lojaId,
      osId,
      termoTexto: termoRenderizado,
      assinaturaDataUrl: assinaturaRef.current?.getDataUrl(),
      operadorId,
    });

    setSalvando(false);

    if (termoError) {
      setErro(termoError.message ?? 'Erro ao registrar termo.');
      return;
    }

    setFotosPendentes([]);
    setPreviews([]);
    setAceito(false);
    assinaturaRef.current?.limpar();
    await carregar();
    onRegistrado?.();
  };

  if (carregando) {
    return <div style={styles.loading}>Carregando termo de entrada...</div>;
  }

  if (evidencias?.termo) {
    return (
      <div style={styles.section}>
        <h3 style={styles.title}>
          <ShieldCheck size={16} color="#4ade80" /> Termo de entrada registrado
        </h3>
        <p style={styles.meta}>
          Aceito em {new Date(evidencias.termo.aceito_em).toLocaleString('pt-BR')}
          {evidencias.termo.ip_cliente ? ` · IP ${evidencias.termo.ip_cliente}` : ''}
        </p>
        <pre style={styles.termoBox}>{evidencias.termo.termo_texto}</pre>

        {evidencias.assinaturaUrl && (
          <div style={styles.block}>
            <span style={styles.label}>Assinatura</span>
            <img src={evidencias.assinaturaUrl} alt="Assinatura" style={styles.assinaturaImg} />
          </div>
        )}

        {evidencias.fotos?.length > 0 && (
          <div style={styles.block}>
            <span style={styles.label}>Fotos de entrada ({evidencias.fotos.length})</span>
            <div style={styles.fotoGrid}>
              {evidencias.fotos.map((foto) => (
                <img key={foto.id} src={foto.url} alt="Entrada" style={styles.fotoThumb} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (somenteLeitura) {
    return (
      <div style={styles.section}>
        <p style={styles.aviso}>Termo de entrada não registrado para esta OS.</p>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h3 style={styles.title}>
        <FileCheck size={16} color="#38bdf8" /> Termo de entrada e evidências
      </h3>
      <p style={styles.desc}>
        Registre aceite, assinatura e fotos do aparelho para proteção jurídica da loja.
      </p>

      <pre style={styles.termoBox}>{termoRenderizado}</pre>

      <label style={styles.checkRow}>
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
        Cliente leu e aceita o termo de entrada
      </label>

      <div style={styles.block}>
        <span style={styles.label}>Assinatura do cliente {exigirTermo ? '*' : ''}</span>
        <AssinaturaCanvas ref={assinaturaRef} />
        <button type="button" style={styles.btnSmall} onClick={() => assinaturaRef.current?.limpar()}>
          <Eraser size={12} /> Limpar assinatura
        </button>
      </div>

      <div style={styles.block}>
        <span style={styles.label}>Fotos do aparelho na entrada {exigirFoto ? '*' : ''}</span>
        <label style={styles.uploadBtn}>
          <Camera size={14} /> Adicionar fotos
          <input type="file" accept="image/*" multiple hidden onChange={handleFotos} />
        </label>
        {previews.length > 0 && (
          <div style={styles.fotoGrid}>
            {previews.map((url, index) => (
              <div key={url} style={styles.fotoWrap}>
                <img src={url} alt="" style={styles.fotoThumb} />
                <button type="button" style={styles.fotoRemove} onClick={() => removerFoto(index)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {erro && <div style={styles.erro}>{erro}</div>}

      {osId && (
        <button type="button" style={styles.btnPrimary} onClick={registrar} disabled={salvando}>
          {salvando ? 'Registrando...' : 'Registrar termo de entrada'}
        </button>
      )}

      {!osId && (
        <p style={styles.aviso}>Salve a OS primeiro para registrar o termo e as fotos.</p>
      )}
    </div>
  );
}

const styles = {
  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  title: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', margin: '0 0 8px 0' },
  desc: { color: '#94a3b8', fontSize: '12px', margin: '0 0 16px 0' },
  meta: { color: '#64748b', fontSize: '12px', margin: '0 0 12px 0' },
  termoBox: {
    backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '14px', color: '#cbd5e1', fontSize: '12px', whiteSpace: 'pre-wrap',
    fontFamily: 'inherit', margin: '0 0 16px 0', maxHeight: '200px', overflow: 'auto',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '13px', marginBottom: '16px' },
  block: { marginBottom: '16px' },
  label: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' },
  btnSmall: {
    marginTop: '8px', background: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8',
    padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', gap: '6px', fontSize: '12px',
  },
  uploadBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0f111a',
    border: '1px dashed #2a2e3f', color: '#38bdf8', padding: '10px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px',
  },
  fotoGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' },
  fotoWrap: { position: 'relative' },
  fotoThumb: { width: '88px', height: '88px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2a2e3f' },
  fotoRemove: {
    position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
    borderRadius: '50%', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
  },
  assinaturaImg: { maxWidth: '280px', border: '1px solid #2a2e3f', borderRadius: '6px', backgroundColor: '#fff' },
  btnPrimary: {
    backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px',
    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
  },
  erro: { color: '#ef4444', fontSize: '13px', marginBottom: '12px' },
  aviso: { color: '#fbbf24', fontSize: '13px', margin: 0 },
  loading: { color: '#94a3b8', fontSize: '13px', padding: '12px 0' },
};
