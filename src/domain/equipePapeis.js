/** Papéis convidáveis (owner só via create-loja). */
export const PAPEIS_CONVIDAVEIS = [
  { id: 'admin', label: 'Administrador' },
  { id: 'gerente', label: 'Gerente' },
  { id: 'vendedor', label: 'Vendedor' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'visualizador', label: 'Visualizador' },
];

export const PAPEIS_LABEL = {
  owner: 'Proprietário',
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  tecnico: 'Técnico',
  financeiro: 'Financeiro',
  visualizador: 'Visualizador',
};

export function labelPapel(papel) {
  return PAPEIS_LABEL[papel] ?? papel;
}
