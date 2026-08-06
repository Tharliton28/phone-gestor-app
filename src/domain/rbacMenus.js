/**
 * Menus e ações destrutivas alinhados às policies de escrita (033_rbac).
 * visualizador: só leitura; tecnico: OS; vendedor: vendas; financeiro: lançamentos.
 */

const ALL = ['owner', 'admin', 'gerente', 'vendedor', 'financeiro', 'tecnico', 'visualizador'];

const MENU_PAPEIS = {
  home: ALL,
  vendas: ['owner', 'admin', 'gerente', 'vendedor', 'visualizador'],
  estoque: ['owner', 'admin', 'gerente', 'visualizador'],
  assistencia: ['owner', 'admin', 'gerente', 'tecnico', 'vendedor', 'visualizador'],
  financeiro: ['owner', 'admin', 'gerente', 'financeiro', 'visualizador'],
  fiscal: ['owner', 'admin', 'gerente', 'visualizador'],
  relatorios: ['owner', 'admin', 'gerente', 'financeiro', 'visualizador'],
  config: ['owner', 'admin', 'gerente'],
};

export function papelPodeVerMenu(papel, menuKey) {
  if (!papel) return false;
  const allowed = MENU_PAPEIS[menuKey];
  if (!allowed) return true;
  return allowed.includes(papel);
}

export function papelPodeCancelarVenda(papel) {
  return ['owner', 'admin', 'gerente', 'vendedor'].includes(papel);
}

export function papelPodeEscreverEstoque(papel) {
  return ['owner', 'admin', 'gerente'].includes(papel);
}

export function papelPodeEscreverFinanceiro(papel) {
  return ['owner', 'admin', 'gerente', 'financeiro'].includes(papel);
}

export function papelPodeEscreverVenda(papel) {
  return ['owner', 'admin', 'gerente', 'vendedor'].includes(papel);
}
