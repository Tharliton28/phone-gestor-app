-- Permite regenerar link de aceite (DELETE tokens pendentes/expirados)
CREATE POLICY ordem_servico_aceite_tokens_delete_member ON public.ordem_servico_aceite_tokens
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));
