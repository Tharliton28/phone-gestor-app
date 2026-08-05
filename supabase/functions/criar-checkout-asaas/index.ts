import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANOS_CHECKOUT: Record<
  string,
  { label: string; valor: number; descricao: string }
> = {
  essencial: {
    label: "Essencial",
    valor: 97,
    descricao:
      "PhoneGestor Assinatura Mensal — Plano Essencial (R$ 97/mês). Inclui PDV, estoque por IMEI, OS com evidências, orçamentos, financeiro e até 2 usuários.",
  },
  profissional: {
    label: "Profissional",
    valor: 197,
    descricao:
      "PhoneGestor Assinatura Mensal — Plano Profissional (R$ 197/mês). Inclui tudo do Essencial + NFC-e no PDV, painel fiscal e até 5 usuários.",
  },
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
  const fallback = "https://api-sandbox.asaas.com/v3";
  const raw = String(Deno.env.get("ASAAS_API_URL") || "").trim().replace(/\/$/, "");
  // Evita "Url scheme 'c' not supported" quando a secret veio como caminho Windows
  if (raw && /^https:\/\//i.test(raw)) return raw;
  return fallback;
}

async function asaasFetch(path: string, init: RequestInit = {}) {
  const apiKey = String(Deno.env.get("ASAAS_API_KEY") || "").trim();
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada. Confira Edge Functions → Secrets.");
  if (!apiKey.includes("aact_")) {
    throw new Error(
      "ASAAS_API_KEY parece inválida. Cole a chave completa do Sandbox (começa com $aact_)."
    );
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

    const body = await req.json();
    const lojaId = String(body.loja_id ?? body.lojaId ?? "").trim();
    const plano = String(body.plano ?? "").trim().toLowerCase();

    if (!lojaId) return json(400, { error: "loja_id obrigatório." });
    const planoDef = PLANOS_CHECKOUT[plano];
    if (!planoDef) {
      return json(400, {
        error: "Plano inválido para checkout. Rede é sob consulta.",
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership, error: memErr } = await admin
      .from("usuario_lojas")
      .select("papel")
      .eq("loja_id", lojaId)
      .eq("usuario_id", user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (memErr) return json(500, { error: memErr.message });
    if (!membership || !["owner", "admin"].includes(membership.papel)) {
      return json(403, { error: "Sem permissão para assinar nesta loja." });
    }

    const { data: loja, error: lojaErr } = await admin
      .from("lojas")
      .select(
        "id, razao_social, nome_fantasia, cnpj, email, telefone, asaas_customer_id, asaas_subscription_id"
      )
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

    if (loja.asaas_subscription_id) {
      try {
        await asaasFetch(`/subscriptions/${loja.asaas_subscription_id}`, {
          method: "DELETE",
        });
      } catch {
        // ignora se já cancelada
      }
    }

    const valor = planoDef.valor;
    const externalReference = `${lojaId}:${plano}`;

    const subscription = await asaasFetch("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: valor,
        nextDueDate: dueDatePlus(0),
        cycle: "MONTHLY",
        description: planoDef.descricao.slice(0, 500),
        externalReference,
      }),
    });

    const subscriptionId = String(subscription.id);

    await admin
      .from("lojas")
      .update({
        asaas_subscription_id: subscriptionId,
        asaas_plano_pendente: plano,
      })
      .eq("id", lojaId);

    const payments = await asaasFetch(
      `/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=1`
    );
    let first = Array.isArray(payments.data) ? payments.data[0] : null;

    // Garante a descrição detalhada também na cobrança da fatura
    if (first?.id) {
      try {
        first = await asaasFetch(`/payments/${first.id}`, {
          method: "PUT",
          body: JSON.stringify({
            description: planoDef.descricao.slice(0, 500),
          }),
        });
      } catch {
        // se o update falhar, segue com a fatura mesmo assim
      }
    }

    const invoiceUrl =
      (first?.invoiceUrl as string | undefined) ||
      (subscription.invoiceUrl as string | undefined) ||
      null;

    if (!invoiceUrl && first?.id) {
      const pay = await asaasFetch(`/payments/${first.id}`);
      return json(200, {
        ok: true,
        subscription_id: subscriptionId,
        payment_id: pay.id,
        invoice_url: pay.invoiceUrl ?? null,
        value: valor,
        plano,
      });
    }

    return json(200, {
      ok: true,
      subscription_id: subscriptionId,
      payment_id: first?.id ?? null,
      invoice_url: invoiceUrl,
      value: valor,
      plano,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return json(500, { error: message });
  }
});
