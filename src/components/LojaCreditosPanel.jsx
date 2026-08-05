import React, { useCallback, useEffect, useState } from 'react';
import { Coins, RefreshCw } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import {
  CUSTO_CREDITOS,
  PACOTES_CREDITOS,
  formatarSaldoCreditos,
  rotuloLancamento,
} from '../domain/lojaCreditos';
import {
  getSaldoCreditos,
  listCustosCreditos,
  listLancamentosCreditos,
} from '../services/lojaCreditoService';
import { emitirCreditosAtualizados } from '../utils/creditosEvents';

const WHATSAPP_CREDITOS = '5585989733574';

export default function LojaCreditosPanel() {
  const { lojaAtivaId, lojaAtiva } = useLoja();
  const { alert } = useDialog();
  const [saldo, setSaldo] = useState(0);
  const [lancamentos, setLancamentos] = useState([]);
  const [custos, setCustos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;
    setCarregando(true);

    const [saldoResult, listResult, custosResult] = await Promise.all([
      getSaldoCreditos(lojaAtivaId),
      listLancamentosCreditos(lojaAtivaId, 40),
      listCustosCreditos(),
    ]);

    if (saldoResult.error) {
      await alert(saldoResult.error.message ?? 'Erro ao carregar saldo.', {
        type: 'error',
        title: 'Créditos',
      });
    } else {
      setSaldo(saldoResult.saldo);
      emitirCreditosAtualizados(saldoResult.saldo);
    }

    setLancamentos(listResult.data ?? []);
    setCustos(custosResult.data?.length
      ? custosResult.data
      : Object.entries(CUSTO_CREDITOS).map(([acao, item]) => ({
        acao,
        ...item,
        ativo: true,
      })));
    setCarregando(false);
  }, [lojaAtivaId, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const solicitarPacote = (pacote) => {
    const lojaNome = lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'minha loja';
    const msg = encodeURIComponent(
      `Olá! Quero comprar o pacote de créditos "${pacote.label}" (${pacote.creditos} créditos) para a loja "${lojaNome}".`
    );
    window.open(`https://wa.me/${WHATSAPP_CREDITOS}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  if (carregando) {
    return <p style={styles.muted}>Carregando carteira de créditos...</p>;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.saldoCard}>
        <Coins size={22} color="#fbbf24" />
        <div>
          <p style={styles.saldoLabel}>Saldo da loja</p>
          <p style={styles.saldoValor}>{formatarSaldoCreditos(saldo)}</p>
        </div>
        <button type="button" style={styles.btnGhost} onClick={carregar}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <p style={styles.ajuda}>
        Créditos pagam NFC-e e, em breve, consultas CPF/CNPJ e IMEI. A compra automática via
        gateway está em implementação — por enquanto solicite o pacote pelo WhatsApp e nós
        creditamos na sua loja após a confirmação do pagamento.
      </p>

      <h3 style={styles.titulo}>Tabela de consumo</h3>
      <div style={styles.tabela}>
        {custos.map((item) => (
          <div key={item.acao} style={styles.linha}>
            <span>{item.label}</span>
            <strong>{item.creditos} crédito{item.creditos === 1 ? '' : 's'}</strong>
          </div>
        ))}
      </div>

      <h3 style={styles.titulo}>Pacotes de créditos</h3>
      <div style={styles.pacotes}>
        {PACOTES_CREDITOS.map((pacote) => (
          <button
            key={pacote.id}
            type="button"
            style={styles.pacote}
            onClick={() => solicitarPacote(pacote)}
          >
            <strong>{pacote.label}</strong>
            <span>{pacote.creditos} créditos</span>
            <span style={styles.preco}>{pacote.precoHint}</span>
            <span style={styles.pacoteAcao}>Solicitar no WhatsApp</span>
          </button>
        ))}
      </div>

      <h3 style={styles.titulo}>Extrato recente</h3>
      {lancamentos.length === 0 ? (
        <p style={styles.muted}>Nenhum lançamento ainda.</p>
      ) : (
        <div style={styles.tabela}>
          {lancamentos.map((item) => (
            <div key={item.id} style={styles.linha}>
              <div>
                <div style={styles.lancDesc}>{rotuloLancamento(item)}</div>
                <div style={styles.lancMeta}>
                  {new Date(item.created_at).toLocaleString('pt-BR')} · {item.acao}
                </div>
              </div>
              <strong style={{ color: item.tipo === 'credito' ? '#4ade80' : '#f87171' }}>
                {item.tipo === 'credito' ? '+' : '-'}{item.quantidade}
                <span style={styles.saldoApos}> → {item.saldo_apos}</span>
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  saldoCard: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
    backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '8px',
  },
  saldoLabel: { margin: 0, color: '#94a3b8', fontSize: '12px' },
  saldoValor: { margin: '2px 0 0', color: '#fbbf24', fontSize: '22px', fontWeight: 'bold' },
  ajuda: { margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 },
  titulo: { margin: '8px 0 0', color: '#e2e8f0', fontSize: '14px' },
  tabela: {
    backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '8px', overflow: 'hidden',
  },
  linha: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
    padding: '12px 14px', borderBottom: '1px solid #1f2233', color: '#e2e8f0', fontSize: '13px',
  },
  pacotes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' },
  pacote: {
    backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '8px', padding: '14px',
    color: '#e2e8f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px',
    textAlign: 'left',
  },
  preco: { color: '#94a3b8', fontSize: '12px' },
  pacoteAcao: { marginTop: '8px', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' },
  btnGhost: {
    marginLeft: 'auto', background: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8',
    borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', display: 'inline-flex', gap: '6px',
    fontSize: '12px', alignItems: 'center',
  },
  muted: { color: '#64748b', fontSize: '13px' },
  lancDesc: { fontWeight: 600 },
  lancMeta: { color: '#64748b', fontSize: '11px', marginTop: '2px' },
  saldoApos: { color: '#64748b', fontWeight: 'normal', fontSize: '11px' },
};
