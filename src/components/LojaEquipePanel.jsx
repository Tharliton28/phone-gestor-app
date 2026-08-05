import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, RefreshCw, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { PAPEIS_CONVIDAVEIS, labelPapel } from '../domain/equipePapeis';
import { getLojaEntitlements } from '../services/lojaPlanoService';
import {
  criarConviteLoja,
  desativarMembroLoja,
  linkConvite,
  listarConvitesLoja,
  listarEquipeLoja,
  revogarConviteLoja,
} from '../services/equipeService';

export default function LojaEquipePanel() {
  const { lojaAtivaId, papelAtivo, perfil } = useLoja();
  const { alert, confirm } = useDialog();

  const [membros, setMembros] = useState([]);
  const [convites, setConvites] = useState([]);
  const [entitlements, setEntitlements] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState('vendedor');
  const [ultimoLink, setUltimoLink] = useState('');

  const podeGerir = ['owner', 'admin'].includes(papelAtivo);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;
    setCarregando(true);

    const [eq, conv, ent] = await Promise.all([
      listarEquipeLoja(lojaAtivaId),
      podeGerir ? listarConvitesLoja(lojaAtivaId) : Promise.resolve({ data: [], error: null }),
      getLojaEntitlements(lojaAtivaId),
    ]);

    if (eq.error) {
      await alert(eq.error.message ?? 'Erro ao carregar equipe.', { type: 'error', title: 'Equipe' });
    } else {
      setMembros(eq.data);
    }

    if (!conv.error) setConvites(conv.data ?? []);
    if (!ent.error) setEntitlements(ent.data);

    setCarregando(false);
  }, [lojaAtivaId, podeGerir, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleConvidar = async (e) => {
    e.preventDefault();
    if (!podeGerir || !lojaAtivaId) return;

    if (!entitlements?.podeAdicionarUsuario) {
      await alert(
        'Limite de usuários do plano atingido ou assinatura inativa. Faça upgrade em Plano.',
        { type: 'warning', title: 'Limite do plano' }
      );
      return;
    }

    setEnviando(true);
    const { data, error } = await criarConviteLoja(lojaAtivaId, email, papel);
    setEnviando(false);

    if (error) {
      await alert(error.message ?? 'Falha ao criar convite.', { type: 'error', title: 'Convite' });
      return;
    }

    const url = linkConvite(data.token);
    setUltimoLink(url);
    setEmail('');
    await carregar();
    await alert(
      `Convite criado para ${data.email}.\n\nCopie o link e envie (WhatsApp/e-mail):\n${url}`,
      { type: 'success', title: 'Convite pronto' }
    );
  };

  const copiarLink = async (tokenOrUrl) => {
    const url = tokenOrUrl.startsWith('http') ? tokenOrUrl : linkConvite(tokenOrUrl);
    try {
      await navigator.clipboard.writeText(url);
      await alert('Link copiado.', { type: 'success', title: 'Copiado' });
    } catch {
      setUltimoLink(url);
      await alert(`Não foi possível copiar automaticamente.\n\n${url}`, { type: 'info', title: 'Link' });
    }
  };

  const handleRevogar = async (conviteId) => {
    const ok = await confirm('Revogar este convite?', {
      title: 'Revogar convite',
      confirmLabel: 'Revogar',
      confirmVariant: 'danger',
    });
    if (!ok) return;
    const { error } = await revogarConviteLoja(conviteId);
    if (error) {
      await alert(error.message, { type: 'error', title: 'Erro' });
      return;
    }
    await carregar();
  };

  const handleDesativar = async (membro) => {
    if (membro.usuario_id === perfil?.id) return;
    const ok = await confirm(
      `Remover ${membro.nome || membro.email} da equipe?\nEssa pessoa perde o acesso à loja.`,
      {
        title: 'Remover membro',
        confirmLabel: 'Remover',
        confirmVariant: 'danger',
      }
    );
    if (!ok) return;
    const { error } = await desativarMembroLoja(lojaAtivaId, membro.usuario_id);
    if (error) {
      await alert(error.message, { type: 'error', title: 'Erro' });
      return;
    }
    await carregar();
  };

  if (carregando) {
    return <p style={styles.muted}>Carregando equipe...</p>;
  }

  const pendentes = convites.filter((c) => c.status === 'pendente');

  return (
    <div style={styles.wrap}>
      <div style={styles.resumo}>
        <Users size={18} color="#38bdf8" />
        <div>
          <p style={styles.resumoTitulo}>
            {entitlements
              ? `${entitlements.usuariosAtivos}/${entitlements.maxUsuarios} usuários no plano ${entitlements.label}`
              : 'Equipe da loja'}
          </p>
          <p style={styles.muted}>
            Convide por e-mail. O convidado cria conta (ou entra) com o mesmo e-mail e aceita o link.
          </p>
        </div>
        <button type="button" style={styles.btnGhost} onClick={carregar}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {podeGerir && (
        <form onSubmit={handleConvidar} style={styles.formConvite}>
          <h4 style={styles.subtitulo}>
            <UserPlus size={16} /> Novo convite
          </h4>
          <div style={styles.formRow}>
            <input
              style={styles.input}
              type="email"
              required
              placeholder="email@funcionario.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!entitlements?.podeAdicionarUsuario || enviando}
            />
            <select
              style={styles.select}
              value={papel}
              onChange={(e) => setPapel(e.target.value)}
              disabled={enviando}
            >
              {PAPEIS_CONVIDAVEIS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              style={styles.btnPrimary}
              disabled={!entitlements?.podeAdicionarUsuario || enviando}
            >
              {enviando ? 'Gerando...' : 'Gerar link'}
            </button>
          </div>
          {!entitlements?.podeAdicionarUsuario && (
            <p style={styles.warn}>
              Não é possível convidar agora (limite do plano ou assinatura inativa). Veja a aba Plano.
            </p>
          )}
          {ultimoLink && (
            <div style={styles.linkBox}>
              <code style={styles.linkCode}>{ultimoLink}</code>
              <button type="button" style={styles.btnGhost} onClick={() => copiarLink(ultimoLink)}>
                <Copy size={14} /> Copiar
              </button>
            </div>
          )}
        </form>
      )}

      <h4 style={styles.subtitulo}>Membros ativos</h4>
      <div style={styles.table}>
        {membros.length === 0 ? (
          <p style={styles.muted}>Nenhum membro encontrado.</p>
        ) : (
          membros.map((m) => (
            <div key={m.membership_id} style={styles.row}>
              <div>
                <p style={styles.nome}>{m.nome || '—'}</p>
                <p style={styles.muted}>{m.email}</p>
              </div>
              <span style={styles.badge}>{labelPapel(m.papel)}</span>
              {podeGerir && m.papel !== 'owner' && m.usuario_id !== perfil?.id && (
                <button type="button" style={styles.btnDangerGhost} onClick={() => handleDesativar(m)}>
                  <UserMinus size={14} /> Remover
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {podeGerir && (
        <>
          <h4 style={{ ...styles.subtitulo, marginTop: 28 }}>Convites pendentes</h4>
          <div style={styles.table}>
            {pendentes.length === 0 ? (
              <p style={styles.muted}>Nenhum convite pendente.</p>
            ) : (
              pendentes.map((c) => (
                <div key={c.id} style={styles.row}>
                  <div>
                    <p style={styles.nome}>{c.email}</p>
                    <p style={styles.muted}>
                      {labelPapel(c.papel)} · expira{' '}
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </p>
                  </div>
                  <button type="button" style={styles.btnGhost} onClick={() => copiarLink(c.token)}>
                    <Link2 size={14} /> Copiar link
                  </button>
                  <button type="button" style={styles.btnDangerGhost} onClick={() => handleRevogar(c.id)}>
                    <Trash2 size={14} /> Revogar
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  resumo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    background: '#0f111a',
    border: '1px solid #1f2233',
    borderRadius: 8,
  },
  resumoTitulo: { margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: 14 },
  muted: { margin: '4px 0 0', color: '#64748b', fontSize: 12 },
  warn: { margin: '8px 0 0', color: '#fbbf24', fontSize: 12 },
  subtitulo: {
    margin: '8px 0 0',
    color: '#e2e8f0',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  formConvite: {
    padding: 16,
    background: '#0f111a',
    border: '1px solid #1f2233',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  formRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  input: {
    flex: '1 1 200px',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #2a2e3f',
    background: '#161925',
    color: '#fff',
    fontSize: 13,
  },
  select: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #2a2e3f',
    background: '#161925',
    color: '#fff',
    fontSize: 13,
    minWidth: 150,
  },
  btnPrimary: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid #2a2e3f',
    color: '#e2e8f0',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    marginLeft: 'auto',
  },
  btnDangerGhost: {
    background: 'transparent',
    border: '1px solid #7f1d1d',
    color: '#fca5a5',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
  },
  linkBox: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    background: '#161925',
    borderRadius: 6,
    border: '1px solid #2a2e3f',
  },
  linkCode: {
    flex: 1,
    fontSize: 11,
    color: '#93c5fd',
    wordBreak: 'break-all',
  },
  table: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: '#0f111a',
    border: '1px solid #1f2233',
    borderRadius: 8,
    flexWrap: 'wrap',
  },
  nome: { margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: 13 },
  badge: {
    background: 'rgba(56,189,248,0.12)',
    color: '#38bdf8',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
  },
};
