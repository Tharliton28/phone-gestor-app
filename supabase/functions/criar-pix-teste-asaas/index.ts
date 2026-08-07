import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Smoke test: cobrança PIX de R$ 5,00 (mínimo Asaas) → webhook credita 1 crédito.
 * Uso temporário para validar Asaas produção + webhook. Remover quando E2E estiver verde.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function asaasBaseUrl() {
  const raw = String(Deno.env.get("ASAAS_API_URL") || "").trim().replace(/\/$/, "");
  if (raw && /^https:\/\//i.test(raw)) return raw;
  const mode = String(Deno.env.get("ASAAS_ENV") || "sandbox").trim().toLowerCase();
  if (mode === "production" || mode === "prod") return "https://api.asaas.com/v3";
  return "https://api-sandbox.asaas.com/v3";
}

async function asaasFetch(path: string, init: RequestInit = {}) {
  const apiKey = String(Deno.env.get("ASAAS_API_KEY") || "").trim();
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada. Confira Edge Functions → Secrets.");
  if (!/\$?aact_/i.test(apiKey)) {
    throw new Error("ASAAS_API_KEY parece inválida. Use a chave da API Asaas (começa com $aact_).");
  }

  const url = `${asaasBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "PhoneGestor/1.0",
      access_token: apiKey,
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const errors = data?.errors as Array<{ description?: string }> | undefined;
    const msg = errors?.[0]?.description || data?.message || `Asaas HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

function dueDatePlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
    if (!authHeader) return json(401, { error: "Não autenticado." });

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
    if (userError || !user) return json(401, { error: "Sessão inválida." });

    const body = await req.json().catch(() => ({}));
    const lojaId = String(body?.loja_id ?? body?.lojaId ?? "").trim();
    if (!lojaId) return json(400, { error: "loja_id obrigatório." });

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership, error: memErr } = await admin
      .from("usuario_lojas")
      .select("papel")
      .eq("loja_id", lojaId)
      .eq("usuario_id", user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (memErr) return json(500, { error: memErr.message });
    if (!membership || membership.papel !== "owner") {
      return json(403, { error: "Somente o owner pode gerar o Pix de teste." });
    }

    const { data: loja, error: lojaErr } = await admin
      .from("lojas")
      .select("id, razao_social, nome_fantasia, cnpj, email, telefone, asaas_customer_id")
      .eq("id", lojaId)
      .single();

    if (lojaErr || !loja) return json(404, { error: "Loja não encontrada." });

    const cnpj = onlyDigits(loja.cnpj);
    if (cnpj.length !== 14) {
      return json(400, { error: "CNPJ da loja inválido para cobrança." });
    }

    let customerId = loja.asaas_customer_id as string | null;
    if (!customerId) {
      try {
        const customer = await asaasFetch("/customers", {
          method: "POST",
          body: JSON.stringify({
            name: loja.nome_fantasia || loja.razao_social,
            cpfCnpj: cnpj,
            email: loja.email || user.email,
            mobilePhone: onlyDigits(loja.telefone) || undefined,
            externalReference: loja.id,
            notificationDisabled: false,
          }),
        });
        customerId = String(customer.id);
      } catch (createErr) {
        const listed = await asaasFetch(`/customers?cpfCnpj=${encodeURIComponent(cnpj)}&limit=1`);
        const existing = Array.isArray(listed.data) ? listed.data[0] : null;
        if (!existing?.id) throw createErr;
        customerId = String(existing.id);
      }
      await admin.from("lojas").update({ asaas_customer_id: customerId }).eq("id", lojaId);
    }

    // 1 crédito — mesmo caminho do webhook de pacotes
    const pacoteId = "smoke_pix";
    const creditos = 1;
    const valor = 5; // mínimo Asaas produção
    const externalReference = `creditos:${lojaId}:${pacoteId}:${creditos}`;
    const description =
      "PhoneGestor TESTE PIX R$ 5,00 — valida webhook e credita 1 crédito. Não é pacote comercial.";

    const payment = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: valor,
        dueDate: dueDatePlus(0),
        description: description.slice(0, 500),
        externalReference,
      }),
    });

    const paymentId = String(payment.id ?? "");
    const invoiceUrl = (payment.invoiceUrl as string | undefined) || null;

    let pix: Record<string, unknown> | null = null;
    if (paymentId) {
      try {
        pix = await asaasFetch(`/payments/${paymentId}/pixQrCode`);
      } catch {
        pix = null;
      }
    }

    if (!invoiceUrl && !pix?.payload) {
      return json(500, {
        error: "Cobrança criada, mas o Asaas não retornou link nem QR Pix.",
        payment_id: paymentId || null,
      });
    }

    return json(200, {
      ok: true,
      smoke: true,
      payment_id: paymentId || null,
      invoice_url: invoiceUrl,
      value: valor,
      creditos,
      pacote_id: pacoteId,
      pix_payload: (pix?.payload as string | undefined) || null,
      pix_encoded_image: (pix?.encodedImage as string | undefined) || null,
      pix_expiration: (pix?.expirationDate as string | undefined) || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return json(500, { error: message });
  }
});
