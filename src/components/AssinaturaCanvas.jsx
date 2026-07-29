import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

const AssinaturaCanvas = forwardRef(function AssinaturaCanvas({ disabled = false, height = 140 }, ref) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    return undefined;
  }, []);

  const posicao = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const iniciar = (e) => {
    if (disabled) return;
    e.preventDefault();
    desenhando.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = posicao(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const mover = (e) => {
    if (!desenhando.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = posicao(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const parar = () => {
    desenhando.current = false;
  };

  useImperativeHandle(ref, () => ({
    getDataUrl() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    },
    isEmpty() {
      const canvas = canvasRef.current;
      if (!canvas) return true;
      const ctx = canvas.getContext('2d');
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
          return false;
        }
      }
      return true;
    },
    limpar() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '6px',
        border: '1px solid #2a2e3f',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : 'crosshair',
        backgroundColor: '#fff',
      }}
      onMouseDown={iniciar}
      onMouseMove={mover}
      onMouseUp={parar}
      onMouseLeave={parar}
      onTouchStart={iniciar}
      onTouchMove={mover}
      onTouchEnd={parar}
    />
  );
});

export default AssinaturaCanvas;
