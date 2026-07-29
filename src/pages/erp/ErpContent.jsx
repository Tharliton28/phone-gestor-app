import Dashboard from '../../components/Dashboard';
import VendasList from '../../components/VendasList';
import VendaForm from '../../components/VendaForm';
import ClientesList from '../../components/ClientesList';
import ClientesForm from '../../components/ClientesForm';
import HistoricoVendas from '../../components/HistoricoVendas';
import VendaDetalhes from '../../components/VendaDetalhes';
import OrcamentosList from '../../components/OrcamentosList';
import OrcamentoForm from '../../components/OrcamentoForm';
import ConsultaEstoque from '../../components/ConsultaEstoque';
import ProdutoForm from '../../components/ProdutoForm';
import OrdemCompraList from '../../components/OrdemCompraList';
import OrdemCompraForm from '../../components/OrdemCompraForm';
import MovimentacoesEstoque from '../../components/MovimentacoesEstoque';
import Inventario from '../../components/Inventario';
import RupturaEstoque from '../../components/RupturaEstoque';
import OSList from '../../components/OSList';
import OSForm from '../../components/OSForm';
import OSPainelTecnico from '../../components/OSPainelTecnico';
import OSHistorico from '../../components/OSHistorico';
import RecibosNotas from '../../components/RecibosNotas';
import FinanceiroList from '../../components/FinanceiroList';
import FinanceiroForm from '../../components/FinanceiroForm';
import PainelFiscal from '../../components/PainelFiscal';
import ReciboGarantia from '../../components/ReciboGarantia';
import Configuracoes from '../../components/Configuracoes';
import ComingSoon from '../../components/ComingSoon';
import Relatorios from '../../components/Relatorios';
import { useErpNavigation } from '../../hooks/useErpNavigation';

/**
 * Conteúdo ERP — mesma lógica do App.jsx legado, agora driven por URL.
 */
export default function ErpContent() {
  const { telaAtiva, mudarTela, voltarTelaAnterior, dadosNavegacao } = useErpNavigation();

  switch (telaAtiva) {
    case 'home':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Tela Inicial</span> {'>'} Dashboard Diário
          </div>
          <Dashboard aoClicarEmNovaVenda={() => mudarTela('nova-venda')} aoMudarTela={mudarTela} />
        </>
      );

    case 'listagem':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Venda</span> {'>'} Listagem de Vendas
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Listagem de Vendas
            </h2>
          </div>
          <VendasList
            aoClicarEmNovaVenda={() => mudarTela('nova-venda')}
            aoMudarTela={mudarTela}
            mensagemFlash={dadosNavegacao?.mensagemSucesso ?? null}
          />
        </>
      );

    case 'nova-venda':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Venda</span> {'>'} Listagem de Vendas {'>'} Nova
            Venda / Edição
          </div>
          <VendaForm dadosNavegacao={dadosNavegacao} />
        </>
      );

    case 'venda-detalhes':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Venda</span> {'>'} Detalhes da Venda
          </div>
          <VendaDetalhes
            vendaId={dadosNavegacao?.vendaId ?? null}
            aoVoltar={() => voltarTelaAnterior('listagem')}
            aoMudarTela={mudarTela}
          />
        </>
      );

    case 'recibo-garantia':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Vendas</span> {'>'} Listagem de Vendas {'>'}{' '}
            Visualizar Recibo e Garantia
          </div>
          <ReciboGarantia
            aoVoltar={() => voltarTelaAnterior('listagem')}
            vendaSelecionada={dadosNavegacao}
          />
        </>
      );

    case 'clientes':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Pessoas</span> {'>'} Listagem de pessoas
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Listagem de pessoas
            </h2>
          </div>
          <ClientesList
            aoClicarEmCadastrar={() => mudarTela('novo-cliente')}
            aoMudarTela={mudarTela}
          />
        </>
      );

    case 'novo-cliente':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Pessoas</span> {'>'} Clientes {'>'}{' '}
            {dadosNavegacao?.pessoaId ? 'Editar' : 'Novo Cadastro'}
          </div>
          <ClientesForm
            pessoaId={dadosNavegacao?.pessoaId ?? null}
            aoVoltar={() => mudarTela('clientes')}
          />
        </>
      );

    case 'historico':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Venda</span> {'>'} Histórico de Vendas
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Histórico de Vendas
            </h2>
          </div>
          <HistoricoVendas aoMudarTela={mudarTela} />
        </>
      );

    case 'orcamentos':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Orçamento</span> {'>'} Listagem
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Listagem de Orçamentos
            </h2>
          </div>
          <OrcamentosList
            aoClicarEmCadastrar={() => mudarTela('novo-orcamento')}
            aoMudarTela={mudarTela}
          />
        </>
      );

    case 'novo-orcamento':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Orçamento</span> {'>'} Novo
          </div>
          <OrcamentoForm
            aoVoltar={() => voltarTelaAnterior('orcamentos')}
            dadosNavegacao={dadosNavegacao}
          />
        </>
      );

    case 'recibos-notas':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Venda</span> {'>'} Recibos e Notas Fiscais
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Gestão de Recibos e Notas (NFe/NFCe)
            </h2>
          </div>
          <RecibosNotas aoMudarTela={mudarTela} />
        </>
      );

    case 'consulta-estoque':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Estoque</span> {'>'} Estoque Atual
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Consulta de Estoque
            </h2>
          </div>
          <ConsultaEstoque
            aoClicarEmCadastrar={() => mudarTela('novo-produto')}
            aoMudarTela={mudarTela}
          />
        </>
      );

    case 'novo-produto':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Estoque</span> {'>'}{' '}
            {dadosNavegacao?.produtoId ? 'Editar Produto' : 'Cadastro de Produto'}
          </div>
          <ProdutoForm
            produtoId={dadosNavegacao?.produtoId ?? null}
            aoVoltar={() => mudarTela('consulta-estoque')}
          />
        </>
      );

    case 'ordem-compra':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Compras / Estoque</span> {'>'} Ordem de Compra
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Ordens de Compra
            </h2>
          </div>
          <OrdemCompraList
            aoClicarEmNova={() => mudarTela('nova-ordem-compra')}
            aoMudarTela={mudarTela}
          />
        </>
      );

    case 'nova-ordem-compra':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Compras / Estoque</span> {'>'} Ordem de Compra {'>'}{' '}
            Nova
          </div>
          <OrdemCompraForm
            ordemCompraId={dadosNavegacao?.ordemCompraId ?? null}
            aoVoltar={() => mudarTela('ordem-compra')}
          />
        </>
      );

    case 'movimentacoes':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Compras / Estoque</span> {'>'} Movimentações
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Movimentações de Estoque
            </h2>
          </div>
          <MovimentacoesEstoque />
        </>
      );

    case 'inventario':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Compras / Estoque</span> {'>'} Inventário
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Balanço / Inventário Físico
            </h2>
          </div>
          <Inventario />
        </>
      );

    case 'ruptura-estoque':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Compras / Estoque</span> {'>'} Ruptura de Estoque
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Ruptura de Estoque (Saldo Negativo)
            </h2>
          </div>
          <RupturaEstoque aoMudarTela={mudarTela} />
        </>
      );

    case 'listagem-os':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Assistência Técnica</span> {'>'} Listagem de OS
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Gestão de Ordens de Serviço
            </h2>
          </div>
          <OSList aoClicarEmNova={() => mudarTela('nova-os')} aoMudarTela={mudarTela} />
        </>
      );

    case 'nova-os':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Assistência Técnica</span> {'>'} Nova OS / Entrada
          </div>
          <OSForm
            osId={dadosNavegacao?.osId ?? null}
            aoVoltar={() => mudarTela('listagem-os')}
          />
        </>
      );

    case 'painel-tecnico':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Assistência Técnica</span> {'>'} Painel do Técnico
          </div>
          <OSPainelTecnico aoMudarTela={mudarTela} />
        </>
      );

    case 'historico-os':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Assistência Técnica</span> {'>'} Histórico / Finalizadas
          </div>
          <OSHistorico aoMudarTela={mudarTela} />
        </>
      );

    case 'termos-os':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Assistência Técnica</span> {'>'} Termos e Garantia
          </div>
          <ComingSoon
            title="Termos e Garantia de OS"
            description="Configure e imprima termos de responsabilidade e garantia de serviço vinculados às ordens de serviço."
          />
        </>
      );

    case 'relatorios':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Relatórios</span>
          </div>
          <Relatorios />
        </>
      );

    case 'ferramentas':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Ferramentas</span>
          </div>
          <ComingSoon
            title="Ferramentas"
            description="Calculadoras, importação/exportação de dados e utilitários operacionais."
          />
        </>
      );

    case 'documentos':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Documentos</span>
          </div>
          <ComingSoon
            title="Documentos"
            description="Central de recibos, notas e documentos gerados pelo sistema."
          />
        </>
      );

    case 'contas-receber':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Financeiro</span> {'>'} Contas a Receber
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Títulos a Receber (Receitas)
            </h2>
          </div>
          <FinanceiroList
            tipo="receber"
            aoClicarEmNovo={() => mudarTela('novo-lancamento', null, { tipo: 'receita', tipoVolta: 'contas-receber' })}
          />
        </>
      );

    case 'contas-pagar':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Financeiro</span> {'>'} Contas a Pagar
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Títulos a Pagar (Despesas)
            </h2>
          </div>
          <FinanceiroList
            tipo="pagar"
            aoClicarEmNovo={() => mudarTela('novo-lancamento', null, { tipo: 'despesa', tipoVolta: 'contas-pagar' })}
          />
        </>
      );

    case 'novo-lancamento':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Financeiro</span> {'>'} Novo Lançamento Avulso
          </div>
          <FinanceiroForm
            tipoInicial={dadosNavegacao?.tipo ?? 'receita'}
            aoVoltar={() => mudarTela(dadosNavegacao?.tipoVolta ?? 'contas-receber')}
          />
        </>
      );

    case 'painel-fiscal':
      return (
        <>
          <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
            <span style={{ color: '#3b82f6' }}>Fiscal</span> {'>'} Painel Sefaz
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
              Painel de Monitoramento Fiscal
            </h2>
          </div>
          <PainelFiscal />
        </>
      );

    case 'config':
      return <Configuracoes />;

    default:
      return null;
  }
}
