import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import VendasList from './components/VendasList';
import VendaForm from './components/VendaForm';
import ClientesList from './components/ClientesList';
import ClientesForm from './components/ClientesForm';
import HistoricoVendas from './components/HistoricoVendas';
import VendaDetalhes from './components/VendaDetalhes';
import OrcamentosList from './components/OrcamentosList';
import OrcamentoForm from './components/OrcamentoForm';
import ConsultaEstoque from './components/ConsultaEstoque';
import ProdutoForm from './components/ProdutoForm';
import OrdemCompraList from './components/OrdemCompraList';
import OrdemCompraForm from './components/OrdemCompraForm';
import MovimentacoesEstoque from './components/MovimentacoesEstoque';
import Inventario from './components/Inventario';
import VendidosSemEstoque from './components/VendidosSemEstoque';
import OSList from './components/OSList';
import OSForm from './components/OSForm';
import RecibosNotas from './components/RecibosNotas';
import FinanceiroList from './components/FinanceiroList';
import FinanceiroForm from './components/FinanceiroForm';
import PainelFiscal from './components/PainelFiscal';
import ReciboGarantia from './components/ReciboGarantia';
import Configuracoes from './components/Configuracoes';

function App() {
  const [telaAtiva, setTelaAtiva] = useState('listagem');
  const [telaAnterior, setTelaAnterior] = useState(null); 
  const [sidebarAberta, setSidebarAberta] = useState(true);
  
  const [dadosNavegacao, setDadosNavegacao] = useState(null);

  const mudarTela = (novaTela, telaOrigem = null, dados = null) => {
    if (telaOrigem) {
      setTelaAnterior(telaOrigem);
    }
    setDadosNavegacao(dados); 
    setTelaAtiva(novaTela);
  };

  const voltarTelaAnterior = (fallback) => {
    if (telaAnterior) {
      setTelaAtiva(telaAnterior);
      setTelaAnterior(null); 
    } else {
      setTelaAtiva(fallback);
    }
    setDadosNavegacao(null); 
  };

  return (
    <div style={{ display: 'flex', width: '100%', overflowX: 'hidden' }}>
      <Sidebar 
        aoMudarTela={setTelaAtiva} 
        telaAtiva={telaAtiva} 
        sidebarAberta={sidebarAberta} 
        setSidebarAberta={setSidebarAberta} 
      />
      
      <main style={{ 
        marginLeft: sidebarAberta ? '260px' : '70px', 
        width: `calc(100% - ${sidebarAberta ? '260px' : '70px'})`, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        transition: 'all 0.3s ease'
      }}>
        <Topbar />
        
        <div style={{ padding: '24px', backgroundColor: '#0f111a', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {telaAtiva === 'home' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Tela Inicial</span> {'>'} Dashboard Diário
              </div>
              <Dashboard aoClicarEmNovaVenda={() => mudarTela('nova-venda')} aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'listagem' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Venda</span> {'>'} Listagem de Vendas
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Listagem de Vendas</h2>
              </div>
              <VendasList aoClicarEmNovaVenda={() => mudarTela('nova-venda')} aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'nova-venda' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Venda</span> {'>'} Listagem de Vendas {'>'} Nova Venda / Edição
              </div>
              <VendaForm aoVoltar={() => mudarTela('listagem')} />
            </>
          )}

          {telaAtiva === 'venda-detalhes' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Venda</span> {'>'} Detalhes da Venda
              </div>
              <VendaDetalhes aoVoltar={() => voltarTelaAnterior('listagem')} aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'recibo-garantia' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Vendas</span> {'>'} Listagem de Vendas {'>'} Visualizar Recibo e Garantia
              </div>
              <ReciboGarantia aoVoltar={() => voltarTelaAnterior('listagem')} vendaSelecionada={dadosNavegacao} />
            </>
          )}

          {telaAtiva === 'clientes' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Pessoas</span> {'>'} Listagem de pessoas
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Listagem de pessoas</h2>
              </div>
              <ClientesList aoClicarEmCadastrar={() => mudarTela('novo-cliente')} aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'novo-cliente' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Pessoas</span> {'>'} Novo Cadastro
              </div>
              <ClientesForm aoVoltar={() => mudarTela('clientes')} />
            </>
          )}

          {telaAtiva === 'historico' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Venda</span> {'>'} Histórico de Vendas
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Histórico de Vendas</h2>
              </div>
              <HistoricoVendas aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'orcamentos' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Orçamento</span> {'>'} Listagem
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Listagem de Orçamentos</h2>
              </div>
              {/* UPDATE AQUI: Repassando o aoMudarTela para OrcamentosList */}
              <OrcamentosList aoClicarEmCadastrar={() => mudarTela('novo-orcamento')} aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'novo-orcamento' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Orçamento</span> {'>'} Novo
              </div>
              <OrcamentoForm aoVoltar={() => voltarTelaAnterior('orcamentos')} dadosNavegacao={dadosNavegacao} />
            </>
          )}

          {telaAtiva === 'recibos-notas' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Venda</span> {'>'} Recibos e Notas Fiscais
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Gestão de Recibos e Notas (NFe/NFCe)</h2>
              </div>
              <RecibosNotas aoMudarTela={mudarTela} />
            </>
          )}

          {telaAtiva === 'consulta-estoque' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Estoque</span> {'>'} Estoque Atual
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Consulta de Estoque</h2>
              </div>
              <ConsultaEstoque aoClicarEmCadastrar={() => mudarTela('novo-produto')} />
            </>
          )}

          {telaAtiva === 'novo-produto' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Estoque</span> {'>'} Cadastro de Produto
              </div>
              <ProdutoForm aoVoltar={() => mudarTela('consulta-estoque')} />
            </>
          )}

          {telaAtiva === 'ordem-compra' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Compras / Estoque</span> {'>'} Ordem de Compra
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Ordens de Compra</h2>
              </div>
              <OrdemCompraList aoClicarEmNova={() => mudarTela('nova-ordem-compra')} />
            </>
          )}

          {telaAtiva === 'nova-ordem-compra' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Compras / Estoque</span> {'>'} Ordem de Compra {'>'} Nova
              </div>
              <OrdemCompraForm aoVoltar={() => mudarTela('ordem-compra')} />
            </>
          )}

          {telaAtiva === 'movimentacoes' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Compras / Estoque</span> {'>'} Movimentações
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Movimentações de Estoque</h2>
              </div>
              <MovimentacoesEstoque />
            </>
          )}

          {telaAtiva === 'inventario' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Compras / Estoque</span> {'>'} Inventário
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Balanço / Inventário Físico</h2>
              </div>
              <Inventario />
            </>
          )}

          {telaAtiva === 'vendidos-sem-estoque' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Compras / Estoque</span> {'>'} Ruptura de Estoque
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Produtos Vendidos sem Estoque</h2>
              </div>
              <VendidosSemEstoque />
            </>
          )}

          {telaAtiva === 'listagem-os' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Ordem de Serviço</span> {'>'} Listagem
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Gestão de Ordens de Serviço</h2>
              </div>
              <OSList aoClicarEmNova={() => mudarTela('nova-os')} />
            </>
          )}

          {telaAtiva === 'nova-os' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Ordem de Serviço</span> {'>'} Entrada de Equipamento
              </div>
              <OSForm aoVoltar={() => mudarTela('listagem-os')} />
            </>
          )}

          {telaAtiva === 'contas-receber' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Financeiro</span> {'>'} Contas a Receber
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Títulos a Receber (Receitas)</h2>
              </div>
              <FinanceiroList tipo="receber" aoClicarEmNovo={() => mudarTela('novo-lancamento')} />
            </>
          )}

          {telaAtiva === 'contas-pagar' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Financeiro</span> {'>'} Contas a Pagar
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Títulos a Pagar (Despesas)</h2>
              </div>
              <FinanceiroList tipo="pagar" aoClicarEmNovo={() => mudarTela('novo-lancamento')} />
            </>
          )}

          {telaAtiva === 'novo-lancamento' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Financeiro</span> {'>'} Novo Lançamento Avulso
              </div>
              <FinanceiroForm aoVoltar={() => mudarTela('contas-receber')} />
            </>
          )}

          {telaAtiva === 'painel-fiscal' && (
            <>
              <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                <span style={{color: '#3b82f6'}}>Fiscal</span> {'>'} Painel Sefaz
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{color: '#e2e8f0', fontSize: '20px', fontWeight: '600'}}>Painel de Monitoramento Fiscal</h2>
              </div>
              <PainelFiscal />
            </>
          )}

          {telaAtiva === 'config' && (
            <>
              <Configuracoes />
            </>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;