import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Método não permitido." });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json(401, { error: "Não autenticado." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: "Função sem credenciais Supabase." });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json(401, { error: "Sessão inválida. Faça login novamente." });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: memberships, error: membershipError } = await admin
      .from("usuario_lojas")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("ativo", true)
      .limit(1);

    if (membershipError) {
      return json(500, { error: membershipError.message });
    }

    if (memberships?.length) {
      return json(409, { error: "Este usuário já possui uma loja vinculada." });
    }

    const body = await req.json();
    const razaoSocial = String(body.razao_social ?? body.razaoSocial ?? "").trim();
    const cnpj = onlyDigits(body.cnpj);
    const cidade = String(body.cidade ?? "").trim();
    const estado = String(body.estado ?? "").trim().toUpperCase() || null;
    const nomeFantasia = String(body.nome_fantasia ?? body.nomeFantasia ?? "").trim() || null;
    const telefone = String(body.telefone ?? "").trim() || null;
    const email = String(body.email ?? user.email ?? "").trim() || null;

    if (!razaoSocial) {
      return json(400, { error: "Informe a razão social." });
    }
    if (cnpj.length !== 14) {
      return json(400, { error: "CNPJ deve ter 14 dígitos." });
    }
    if (!cidade) {
      return json(400, { error: "Informe a cidade." });
    }
    if (estado && estado.length !== 2) {
      return json(400, { error: "UF deve ter 2 letras (ex: CE)." });
    }

    const { data: cnpjExistente } = await admin
      .from("lojas")
      .select("id")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (cnpjExistente) {
      return json(409, { error: "Já existe uma loja cadastrada com este CNPJ." });
    }

    const { data: loja, error: lojaError } = await admin
      .from("lojas")
      .insert({
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnpj,
        cidade,
        estado,
        email,
        telefone,
        regime_tributario: String(body.regime_tributario ?? body.regimeTributario ?? "Simples Nacional").trim() ||
          "Simples Nacional",
        cep: onlyDigits(body.cep) || null,
        logradouro: String(body.logradouro ?? "").trim() || null,
        numero: String(body.numero ?? "").trim() || null,
        complemento: String(body.complemento ?? "").trim() || null,
        bairro: String(body.bairro ?? "").trim() || null,
        ativo: true,
        plano: "essencial",
        assinatura_status: "trial",
        assinatura_origem: "manual",
        assinatura_expira_em: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, razao_social, cnpj, plano, assinatura_status, assinatura_expira_em")
      .single();

    if (lojaError || !loja) {
      return json(400, { error: lojaError?.message ?? "Falha ao criar a loja." });
    }

    const { error: vinculoError } = await admin.from("usuario_lojas").insert({
      usuario_id: user.id,
      loja_id: loja.id,
      papel: "owner",
      loja_padrao: true,
      ativo: true,
    });

    if (vinculoError) {
      // Rollback best-effort: remove orphan loja if membership failed
      await admin.from("lojas").delete().eq("id", loja.id);
      return json(400, { error: vinculoError.message });
    }

    return json(200, {
      ok: true,
      loja,
      message: "Loja criada com sucesso. Plano Essencial em período de trial.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return json(500, { error: message });
  }
});
