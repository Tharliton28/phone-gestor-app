import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const ZOOM_PASSO = 0.4;

const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor));

/**
 * Visualizador de evidência fotográfica. Zoom é requisito real de uso: é como o
 * técnico confere arranhão, trinca ou número de série na foto registrada.
 */
export default function ImagemLightbox({ fotos = [], indiceInicial = 0, onFechar }) {
  const [indice, setIndice] = useState(indiceInicial);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [arrastandoAtivo, setArrastandoAtivo] = useState(false);
  const origemArraste = useRef(null);

  const foto = fotos[indice];

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const navegar = useCallback((passo) => {
    if (fotos.length < 2) return;
    setIndice((atual) => (atual + passo + fotos.length) % fotos.length);
    reset();
  }, [fotos.length, reset]);

  const aplicarZoom = useCallback((delta) => {
    setZoom((atual) => {
      const novo = limitar(atual + delta, ZOOM_MIN, ZOOM_MAX);
      if (novo === ZOOM_MIN) setPan({ x: 0, y: 0 });
      return novo;
    });
  }, []);

  useEffect(() => {
    const aoTeclar = (event) => {
      if (event.key === 'Escape') onFechar();
      else if (event.key === 'ArrowLeft') navegar(-1);
      else if (event.key === 'ArrowRight') navegar(1);
      else if (event.key === '+' || event.key === '=') aplicarZoom(ZOOM_PASSO);
      else if (event.key === '-') aplicarZoom(-ZOOM_PASSO);
      else if (event.key === '0') reset();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar, navegar, aplicarZoom, reset]);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, []);

  if (!foto) return null;

  const aoRolar = (event) => {
    event.preventDefault();
    aplicarZoom(event.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO);
  };

  const iniciarArraste = (event) => {
    if (zoom === ZOOM_MIN) return;
    origemArraste.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    setArrastandoAtivo(true);
  };

  const arrastar = (event) => {
    if (!origemArraste.current) return;
    setPan({ x: event.clientX - origemArraste.current.x, y: event.clientY - origemArraste.current.y });
  };

  const encerrarArraste = () => {
    origemArraste.current = null;
    setArrastandoAtivo(false);
  };

  return (
    <div
      style={styles.overlay}
      onClick={onFechar}
      onMouseMove={arrastar}
      onMouseUp={encerrarArraste}
      onMouseLeave={encerrarArraste}
    >
      <div style={styles.barra} onClick={(e) => e.stopPropagation()}>
        <span style={styles.legenda}>
          {fotos.length > 1 ? `${indice + 1} de ${fotos.length}` : ''}
          {foto.nome ? ` · ${foto.nome}` : ''}
        </span>
        <div style={styles.acoes}>
          <button type="button" style={styles.btnBarra} onClick={() => aplicarZoom(-ZOOM_PASSO)} title="Diminuir zoom (−)">
            <ZoomOut size={18} />
          </button>
          <span style={styles.nivelZoom}>{Math.round(zoom * 100)}%</span>
          <button type="button" style={styles.btnBarra} onClick={() => aplicarZoom(ZOOM_PASSO)} title="Aumentar zoom (+)">
            <ZoomIn size={18} />
          </button>
          <button type="button" style={styles.btnBarra} onClick={reset} title="Tamanho original (0)">
            <RotateCcw size={18} />
          </button>
          <button type="button" style={styles.btnBarra} onClick={onFechar} title="Fechar (Esc)">
            <X size={18} />
          </button>
        </div>
      </div>

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            style={{ ...styles.nav, left: '16px' }}
            onClick={(e) => { e.stopPropagation(); navegar(-1); }}
            title="Anterior (←)"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            style={{ ...styles.nav, right: '16px' }}
            onClick={(e) => { e.stopPropagation(); navegar(1); }}
            title="Próxima (→)"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <img
        src={foto.url}
        alt={foto.nome ?? 'Foto da OS'}
        onClick={(e) => e.stopPropagation()}
        onWheel={aoRolar}
        onMouseDown={iniciarArraste}
        onDoubleClick={() => (zoom === ZOOM_MIN ? aplicarZoom(ZOOM_PASSO * 3) : reset())}
        draggable={false}
        style={{
          ...styles.imagem,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: zoom > ZOOM_MIN ? (arrastandoAtivo ? 'grabbing' : 'grab') : 'zoom-in',
        }}
      />

      <p style={styles.dica} onClick={(e) => e.stopPropagation()}>
        Role para dar zoom · arraste para mover · duplo clique alterna · Esc fecha
      </p>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'rgba(2, 6, 18, 0.94)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  barra: {
    position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: '16px', padding: '12px 16px',
    backgroundColor: 'rgba(15, 17, 26, 0.9)', borderBottom: '1px solid #1f2233',
  },
  legenda: {
    color: '#94a3b8', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  acoes: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  nivelZoom: { color: '#94a3b8', fontSize: '12px', minWidth: '44px', textAlign: 'center' },
  btnBarra: {
    background: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', borderRadius: '6px',
    padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  nav: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(15, 17, 26, 0.85)',
    border: '1px solid #2a2e3f', color: '#e2e8f0', borderRadius: '50%', width: '48px', height: '48px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  imagem: {
    maxWidth: '88vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: '4px',
    transition: 'transform 80ms linear', userSelect: 'none',
  },
  dica: {
    position: 'absolute', bottom: '14px', left: 0, right: 0, textAlign: 'center',
    color: '#64748b', fontSize: '11px', margin: 0,
  },
};
