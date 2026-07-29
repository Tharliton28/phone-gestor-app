/** Data usada para filtro de período no histórico (finalização ou última atualização) */
export function dataReferenciaHistorico(os) {
  const raw = os.data_finalizacao ?? os.updated_at ?? os.created_at;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}

export function filtrarOsHistorico(ordens, filtros) {
  const {
    dataInicio,
    dataFim,
    busca = '',
    tecnicoId = 'todos',
    status = 'todos',
  } = filtros;

  const termo = busca.trim().toLowerCase();

  return ordens.filter((os) => {
    if (status !== 'todos' && os.status !== status) return false;
    if (tecnicoId !== 'todos' && os.tecnico?.id !== tecnicoId) return false;

    const ref = dataReferenciaHistorico(os);
    if (dataInicio && ref && ref < dataInicio) return false;
    if (dataFim && ref && ref > dataFim) return false;

    if (!termo) return true;

    return (
      os.codigo?.toLowerCase().includes(termo) ||
      os.cliente?.nome?.toLowerCase().includes(termo) ||
      os.aparelho_modelo?.toLowerCase().includes(termo)
    );
  });
}

export function calcResumoHistorico(ordens) {
  let finalizadas = 0;
  let canceladas = 0;
  let faturamento = 0;

  for (const os of ordens) {
    if (os.status === 'finalizada') {
      finalizadas += 1;
      faturamento += Number(os.valor_total) || 0;
    } else if (os.status === 'cancelada') {
      canceladas += 1;
    }
  }

  return { finalizadas, canceladas, faturamento, total: ordens.length };
}
