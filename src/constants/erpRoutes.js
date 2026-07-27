/** Mapeamento tela legada (App.jsx) ↔ rotas URL */
export const TELA_ROUTES = {
  home: '/app/inicio',
  listagem: '/app/vendas',
  'nova-venda': '/app/vendas/nova',
  'venda-detalhes': '/app/vendas/detalhes',
  'recibo-garantia': '/app/vendas/recibo-garantia',
  clientes: '/app/clientes',
  'novo-cliente': '/app/clientes/novo',
  historico: '/app/vendas/historico',
  orcamentos: '/app/orcamentos',
  'novo-orcamento': '/app/orcamentos/novo',
  'recibos-notas': '/app/recibos-notas',
  'consulta-estoque': '/app/estoque',
  'novo-produto': '/app/estoque/produto/novo',
  'ordem-compra': '/app/compras',
  'nova-ordem-compra': '/app/compras/nova',
  movimentacoes: '/app/estoque/movimentacoes',
  inventario: '/app/estoque/inventario',
  'vendidos-sem-estoque': '/app/estoque/ruptura',
  'listagem-os': '/app/os',
  'nova-os': '/app/os/nova',
  'contas-receber': '/app/financeiro/receber',
  'contas-pagar': '/app/financeiro/pagar',
  'novo-lancamento': '/app/financeiro/novo',
  'painel-fiscal': '/app/fiscal',
  config: '/app/config',
};

const ROUTE_TO_TELA = Object.fromEntries(
  Object.entries(TELA_ROUTES).map(([tela, rota]) => [rota, tela])
);

export const pathToTela = (pathname) =>
  ROUTE_TO_TELA[pathname] ?? 'listagem';

export const telaToPath = (tela) =>
  TELA_ROUTES[tela] ?? TELA_ROUTES.listagem;

/** Paths relativos a /app para <Route path="..." /> */
export const ERP_ROUTE_ENTRIES = Object.entries(TELA_ROUTES).map(([tela, rota]) => ({
  tela,
  rota,
  relativePath: rota.replace(/^\/app\/?/, ''),
}));
