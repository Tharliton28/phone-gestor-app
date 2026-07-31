import { describe, expect, it } from 'vitest';
import { podePrevisualizarImagem } from './fotoPreview';

describe('fotoPreview', () => {
  it('não pré-visualiza HEIC no navegador', () => {
    expect(podePrevisualizarImagem({ type: 'image/heic' })).toBe(false);
    expect(podePrevisualizarImagem({ type: 'image/heif' })).toBe(false);
  });

  it('pré-visualiza JPEG e PNG', () => {
    expect(podePrevisualizarImagem({ type: 'image/jpeg' })).toBe(true);
    expect(podePrevisualizarImagem({ type: 'image/png' })).toBe(true);
  });
});
