-- =============================================================================
-- Phone Gestor ERP — Cliente vê as fotos antes de assinar
--
-- O termo afirma que o cliente conferiu o estado do aparelho conforme as fotos
-- registradas. Se a página de aceite não mostra essas fotos, a defesa mais fácil
-- do cliente em disputa é "assinei sem ver nada". Esta migration entrega as fotos
-- do momento correspondente junto com o termo, e libera a leitura delas para o
-- visitante anônimo apenas enquanto existir um token de aceite válido.
-- =============================================================================

-- Autoriza leitura pública de UMA foto específica só quando há token pendente
-- para aquela OS e o arquivo pertence ao momento do termo em assinatura.
-- SECURITY DEFINER porque anon não enxerga a tabela de tokens.
CREATE OR REPLACE FUNCTION public.os_foto_liberada_por_aceite(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ordem_servico_aceite_tokens t
    WHERE t.usado_em IS NULL
      AND t.expires_at > now()
      AND t.loja_id::text = split_part(p_path, '/', 1)
      AND t.ordem_servico_id::text = split_part(p_path, '/', 2)
      AND split_part(p_path, '/', 3) LIKE t.tipo::text || '-foto-%'
  );
$$;

REVOKE ALL ON FUNCTION public.os_foto_liberada_por_aceite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.os_foto_liberada_por_aceite(text) TO anon, authenticated;

-- Fotos do reparo ('durante-foto-*') nunca entram aqui: são uso interno da loja.
DROP POLICY IF EXISTS os_evidencias_select_aceite_publico ON storage.objects;

CREATE POLICY os_evidencias_select_aceite_publico ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'os-evidencias'
  AND public.os_foto_liberada_por_aceite(name)
);

-- ---------------------------------------------------------------------------
-- RPC de aceite passa a devolver as fotos do momento do termo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obter_aceite_os_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ordem_servico_aceite_tokens%ROWTYPE;
  v_codigo text;
  v_loja text;
  v_fotos json;
BEGIN
  SELECT * INTO v_row
  FROM public.ordem_servico_aceite_tokens
  WHERE token = p_token
    AND usado_em IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link inválido ou expirado.';
  END IF;

  SELECT codigo INTO v_codigo FROM public.ordens_servico WHERE id = v_row.ordem_servico_id;
  SELECT COALESCE(nome_fantasia, razao_social) INTO v_loja FROM public.lojas WHERE id = v_row.loja_id;

  SELECT COALESCE(json_agg(f.storage_path ORDER BY f.created_at), '[]'::json)
  INTO v_fotos
  FROM public.ordem_servico_fotos f
  WHERE f.ordem_servico_id = v_row.ordem_servico_id
    AND f.momento::text = v_row.tipo::text;

  RETURN json_build_object(
    'token', v_row.token,
    'tipo', v_row.tipo,
    'codigo_os', v_codigo,
    'nome_empresa', v_loja,
    'termo_texto', v_row.termo_texto,
    'expires_at', v_row.expires_at,
    'fotos', v_fotos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obter_aceite_os_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_aceite_os_token(uuid) TO anon, authenticated;
