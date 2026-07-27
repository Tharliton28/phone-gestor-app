import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const LOJA_ATIVA_KEY = 'phonegestor_loja_ativa_id';

const LojaContext = createContext(null);

export function LojaProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [lojaAtivaId, setLojaAtivaIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarDados = useCallback(async () => {
    if (!user?.id) {
      setPerfil(null);
      setMemberships([]);
      setLojaAtivaIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [perfilResult, membershipsResult] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nome, email, avatar_url')
          .eq('id', user.id)
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
              logo_url,
              ativo
            )
          `
          )
          .eq('usuario_id', user.id)
          .eq('ativo', true),
      ]);

      if (perfilResult.error) throw perfilResult.error;
      if (membershipsResult.error) throw membershipsResult.error;

      const perfilData = perfilResult.data ?? {
        id: user.id,
        nome: user.user_metadata?.nome ?? user.email?.split('@')[0] ?? 'Usuário',
        email: user.email ?? '',
        avatar_url: null,
      };

      const lojasAtivas = (membershipsResult.data ?? []).filter(
        (item) => item.loja?.ativo !== false
      );

      setPerfil(perfilData);
      setMemberships(lojasAtivas);

      const idsValidos = lojasAtivas.map((m) => m.loja.id);
      const salvo = localStorage.getItem(LOJA_ATIVA_KEY);
      const padrao = lojasAtivas.find((m) => m.loja_padrao)?.loja?.id;
      const proxima =
        (salvo && idsValidos.includes(salvo) && salvo) ||
        padrao ||
        idsValidos[0] ||
        null;

      setLojaAtivaIdState(proxima);
      if (proxima) localStorage.setItem(LOJA_ATIVA_KEY, proxima);
      else localStorage.removeItem(LOJA_ATIVA_KEY);
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar dados da loja.');
      setPerfil(null);
      setMemberships([]);
      setLojaAtivaIdState(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPerfil(null);
      setMemberships([]);
      setLojaAtivaIdState(null);
      setLoading(false);
      return;
    }
    carregarDados();
  }, [isAuthenticated, carregarDados]);

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
