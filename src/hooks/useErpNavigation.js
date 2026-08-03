import { useLocation, useNavigate } from 'react-router-dom';
import { pathToTela, telaToPath } from '../constants/erpRoutes';

/**
 * Ponte entre a API legada (mudarTela) e react-router-dom.
 * Permite migrar telas ERP gradualmente sem reescrever todos os componentes.
 */
export function useErpNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const telaAtiva = pathToTela(location.pathname);
  const dadosNavegacao = location.state?.dadosNavegacao ?? null;
  const telaOrigem = location.state?.telaOrigem ?? null;

  const mudarTela = (novaTela, origem = null, dados = null) => {
    const path = telaToPath(novaTela);
    navigate(path, {
      state: {
        telaOrigem: origem ?? telaAtiva,
        dadosNavegacao: dados,
      },
    });
  };

  const voltarTelaAnterior = (fallback = 'listagem') => {
    // Preferir histórico do browser: restaura location.state anterior
    // (ex.: recibo → detalhes com vendaId; detalhes → histórico).
    if (telaOrigem && telaOrigem !== telaAtiva) {
      navigate(-1);
      return;
    }

    navigate(telaToPath(fallback));
  };

  const irParaListagemVendas = (dados = null) => {
    navigate(telaToPath('listagem'), {
      replace: true,
      state: dados
        ? { dadosNavegacao: dados, telaOrigem: 'nova-venda' }
        : { dadosNavegacao: null, telaOrigem: 'listagem' },
    });
  };

  return {
    telaAtiva,
    dadosNavegacao,
    telaOrigem,
    mudarTela,
    voltarTelaAnterior,
    irParaListagemVendas,
  };
}
