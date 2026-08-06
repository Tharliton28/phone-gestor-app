import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, ExternalLink } from 'lucide-react';
import { listHomePatrocinios } from '../domain/homePatrocinios';

const AUTO_MS = 6500;

export default function DashboardSponsorCarousel({ slots } = {}) {
  const itens = listHomePatrocinios(slots);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || itens.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % itens.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, itens.length]);

  if (!itens.length) return null;

  const atual = itens[index] ?? itens[0];
  if (!atual) return null;

  const ir = (delta) => {
    setIndex((prev) => (prev + delta + itens.length) % itens.length);
  };

  return (
    <section
      className="dash-sponsor"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Espaços patrocinados"
    >
      <article
        className="dash-sponsor__slide"
        style={{ backgroundImage: atual.gradiente }}
        key={atual.id}
      >
        <div className="dash-sponsor__glow" style={{ background: atual.accent }} />
        <div className="dash-sponsor__content">
          <span className="dash-sponsor__badge" style={{ color: atual.accent, borderColor: `${atual.accent}66` }}>
            <Megaphone size={12} /> {atual.badge}
          </span>
          <h3 className="dash-sponsor__title">{atual.titulo}</h3>
          <p className="dash-sponsor__sub">{atual.subtitulo}</p>
          <a
            className="dash-sponsor__cta"
            href={atual.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: atual.accent, color: '#0f172a' }}
          >
            {atual.ctaLabel} <ExternalLink size={14} />
          </a>
        </div>

        <div className="dash-sponsor__controls">
          <button type="button" className="dash-sponsor__nav" onClick={() => ir(-1)} aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="dash-sponsor__dots">
            {itens.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`dash-sponsor__dot${i === index ? ' is-active' : ''}`}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button type="button" className="dash-sponsor__nav" onClick={() => ir(1)} aria-label="Próximo">
            <ChevronRight size={18} />
          </button>
        </div>
      </article>
    </section>
  );
}
