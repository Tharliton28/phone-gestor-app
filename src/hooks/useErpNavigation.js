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
    if (telaOrigem) {
      navigate(telaToPath(telaOrigem));
      return;
    }
    navigate(telaToPath(fallback));
  };

  return {
    telaAtiva,
    dadosNavegacao,
    telaOrigem,
    mudarTela,
    voltarTelaAnterior,
  };
}
