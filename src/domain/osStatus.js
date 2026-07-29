/** Colunas do painel kanban (status ativos no fluxo) */
export const KANBAN_COLUMNS = [
  { id: 'aberta', label: 'Aberta' },
  { id: 'em_manutencao', label: 'Em Manutenção' },
  { id: 'aguardando_peca', label: 'Aguardando Peça' },
  { id: 'finalizada', label: 'Finalizada' },
];

export const STATUS_TERMINAL = ['finalizada', 'cancelada'];

export function isStatusTerminal(status) {
  return STATUS_TERMINAL.includes(status);
}

/** OS ainda pode ser movida no kanban */
export function podeAlterarStatusKanban(status) {
  return !isStatusTerminal(status) && status !== 'cancelada';
}

/** Próximos status permitidos a partir do atual (inclui finalizar/cancelar) */
export function transicoesPermitidas(statusAtual) {
  if (isStatusTerminal(statusAtual)) return [];

  const workflow = ['aberta', 'em_manutencao', 'aguardando_peca'];
  const outros = workflow.filter((s) => s !== statusAtual);

  return [...outros, 'finalizada', 'cancelada'];
}

export function podeMoverPara(statusAtual, statusNovo) {
  if (statusAtual === statusNovo) return false;
  if (isStatusTerminal(statusAtual)) return false;
  return transicoesPermitidas(statusAtual).includes(statusNovo);
}
