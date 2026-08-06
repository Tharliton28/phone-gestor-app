import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { assinaturaEstaAtiva } from '../domain/lojaPlanos';
import { getLojaEntitlements } from '../services/lojaPlanoService';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const LOJA_ATIVA_KEY = 'phonegestor_loja_ativa_id';

const LojaContext = createContext(null);

export function LojaProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;
  const [perfil, setPerfil] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [lojaAtivaId, setLojaAtivaIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const jaCarregouRef = useRef(false);

  const carregarDados = useCallback(async (opts = {}) => {
    const currentUser = userRef.current;
    if (!currentUser?.id) {
      setPerfil(null);
      setMemberships([]);
      setLojaAtivaIdState(null);
      setLoading(false);
      jaCarregouRef.current = false;
      return;
    }

    // Silent refresh: não desmonta o ERP (evita zerar formulários ao voltar para a aba)
    const silent =
      opts.silent === true || (opts.silent !== false && jaCarregouRef.current);
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [perfilResult, membershipsResult] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nome, email, avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle(),
        supabase
          .from('usuario_lojas')
          .select(
            `
            id,
            papel,
            loja_padrao,
            ativo,
            loja:lojas (
              id,
              razao_social,
              nome_fantasia,
              cnpj,
              inscricao_estadual,
              inscricao_municipal,
              regime_tributario,
              email,
              telefone,
              cep,
              logradouro,
              numero,
              complemento,
              bairro,
              cidade,
              estado,
              codigo_ibge,
              logo_url,
              ativo,
              plano,
              assinatura_status,
              assinatura_origem,
              assinatura_expira_em,
              plano_atualizado_em
            )
          `
          )
          .eq('usuario_id', currentUser.id)
          .eq('ativo', true),
      ]);

      if (perfilResult.error) throw perfilResult.error;
      if (membershipsResult.error) throw membershipsResult.error;

      const perfilData = perfilResult.data ?? {
        id: currentUser.id,
        nome: currentUser.user_metadata?.nome ?? currentUser.email?.split('@')[0] ?? 'Usuário',
        email: currentUser.email ?? '',
        avatar_url: null,
      };

      let lojasAtivas = (membershipsResult.data ?? []).filter(
        (item) => item.loja?.ativo !== false
      );

      const idsValidos = lojasAtivas.map((m) => m.loja.id);
      const salvo = localStorage.getItem(LOJA_ATIVA_KEY);
      const padrao = lojasAtivas.find((m) => m.loja_padrao)?.loja?.id;
      const proxima =
        (salvo && idsValidos.includes(salvo) && salvo) ||
        padrao ||
        idsValidos[0] ||
        null;

      // Sincroniza expiração no banco (trial/ativa vencidos → suspensa)
      if (proxima) {
        const { data: ent } = await getLojaEntitlements(proxima);
        if (ent) {
          lojasAtivas = lojasAtivas.map((m) =>
            m.loja?.id === proxima
              ? {
                  ...m,
                  loja: {
                    ...m.loja,
                    assinatura_status: ent.assinaturaStatus,
                    assinatura_expira_em: ent.assinaturaExpiraEm,
                    plano: ent.plano,
                  },
                }
              : m
          );
        }
      }

      setPerfil(perfilData);
      setMemberships(lojasAtivas);
      setLojaAtivaIdState(proxima);
      jaCarregouRef.current = true;
      if (proxima) localStorage.setItem(LOJA_ATIVA_KEY, proxima);
      else localStorage.removeItem(LOJA_ATIVA_KEY);
    } catch (err) {
      const message = err.message ?? 'Erro ao carregar dados da loja.';
      if (silent && jaCarregouRef.current) {
        // Falha transitória (rede/aba em background): preserva UI e formulários abertos
        setError(null);
        console.warn('[LojaContext] refresh silencioso falhou:', message);
      } else {
        setError(message);
        setPerfil(null);
        setMemberships([]);
        setLojaAtivaIdState(null);
        jaCarregouRef.current = false;
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setPerfil(null);
      setMemberships([]);
      setLojaAtivaIdState(null);
      setLoading(false);
      jaCarregouRef.current = false;
      return;
    }
    // Já carregou: refresh silencioso (token refresh / re-render de auth não desmonta telas)
    carregarDados({ silent: jaCarregouRef.current });
  }, [isAuthenticated, userId, carregarDados]);

  const setLojaAtiva = useCallback((lojaId) => {
    setLojaAtivaIdState(lojaId);
    if (lojaId) localStorage.setItem(LOJA_ATIVA_KEY, lojaId);
    else localStorage.removeItem(LOJA_ATIVA_KEY);
  }, []);

  const lojaAtiva = useMemo(() => {
    const membership = memberships.find((m) => m.loja?.id === lojaAtivaId);
    return membership?.loja ?? null;
  }, [memberships, lojaAtivaId]);

  const papelAtivo = useMemo(() => {
    const membership = memberships.find((m) => m.loja?.id === lojaAtivaId);
    return membership?.papel ?? null;
  }, [memberships, lojaAtivaId]);

  const lojas = useMemo(
    () => memberships.map((m) => m.loja).filter(Boolean),
    [memberships]
  );

  const temPermissao = useCallback(
    (...papeis) => {
      if (!papelAtivo) return false;
      if (papeis.length === 0) return true;
      return papeis.includes(papelAtivo);
    },
    [papelAtivo]
  );

  const assinaturaStatus = lojaAtiva?.assinatura_status ?? null;
  const assinaturaExpiraEm = lojaAtiva?.assinatura_expira_em ?? null;
  const assinaturaAtiva = Boolean(
    lojaAtiva && assinaturaEstaAtiva(assinaturaStatus, assinaturaExpiraEm)
  );

  const value = useMemo(
    () => ({
      perfil,
      memberships,
      lojas,
      lojaAtiva,
      lojaAtivaId,
      papelAtivo,
      loading,
      error,
      setLojaAtiva,
      recarregar: carregarDados,
      temPermissao,
      temLoja: Boolean(lojaAtiva),
      assinaturaStatus,
      assinaturaExpiraEm,
      assinaturaAtiva,
    }),
    [
      perfil,
      memberships,
      lojas,
      lojaAtiva,
      lojaAtivaId,
      papelAtivo,
      loading,
      error,
      setLojaAtiva,
      carregarDados,
      temPermissao,
      assinaturaStatus,
      assinaturaExpiraEm,
      assinaturaAtiva,
    ]
  );

  return <LojaContext.Provider value={value}>{children}</LojaContext.Provider>;
}

export function useLoja() {
  const context = useContext(LojaContext);
  if (!context) {
    throw new Error('useLoja deve ser usado dentro de LojaProvider');
  }
  return context;
}
