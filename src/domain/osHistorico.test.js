import { describe, expect, it } from 'vitest';
import {
  calcResumoHistorico,
  dataReferenciaHistorico,
  filtrarOsHistorico,
} from './osHistorico';

describe('osHistorico', () => {
  const ordens = [
    {
      id: '1',
      codigo: 'OS-0001',
      status: 'finalizada',
      valor_total: 100,
      data_finalizacao: '2026-07-20T10:00:00Z',
      cliente: { nome: 'Ana' },
      tecnico: { id: 't1', nome: 'João' },
      aparelho_modelo: 'iPhone 12',
    },
    {
      id: '2',
      codigo: 'OS-0002',
      status: 'cancelada',
      valor_total: 50,
      updated_at: '2026-07-25T10:00:00Z',
      cliente: { nome: 'Bruno' },
      tecnico: { id: 't2', nome: 'Maria' },
      aparelho_modelo: 'Samsung A54',
    },
  ];

  it('usa data de finalização ou updated_at como referência', () => {
    expect(dataReferenciaHistorico(ordens[0])).toBe('2026-07-20');
    expect(dataReferenciaHistorico(ordens[1])).toBe('2026-07-25');
  });

  it('filtra por período, status e técnico', () => {
    const filtradas = filtrarOsHistorico(ordens, {
      dataInicio: '2026-07-01',
      dataFim: '2026-07-22',
      status: 'finalizada',
      tecnicoId: 't1',
      busca: '',
    });

    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].codigo).toBe('OS-0001');
  });

  it('calcula resumo do histórico', () => {
    expect(calcResumoHistorico(ordens)).toEqual({
      finalizadas: 1,
      canceladas: 1,
      faturamento: 100,
      total: 2,
    });
  });
});
