import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseExternalReference(ref: unknown): { lojaId: string | null; plano: string | null } {
  const raw = String(ref ?? "").trim();
  if (!raw) return { lojaId: null, plano: null };
  if (raw.includes(":")) {
    const [lojaId, plano] = raw.split(":");
    return { lojaId: lojaId || null, plano: plano || null };
  }
  // legado: só loja_id
  return { lojaId: raw, plano: null };
}

function addDaysIso(base: Date, days: number) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return json(200, { ok: true, service: "asaas-webhook" });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Método não permitido." });
  }

  try {
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";
    const received =
      req.headers.get("asaas-access-token") ||
      req.headers.get("Asaas-Access-Token") ||
      "";

    if (!expectedToken || received !== expectedToken) {
      return json(401, { error: "Token de webhook inválido." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: "Função sem credenciais Supabase." });
    }

    const payload = await req.json();
    const event = String(payload.event ?? "");
    const eventId = String(payload.id ?? `${event}-${payload.payment?.id ?? Date.now()}`);
    const payment = payload.payment ?? {};

    const fromPayment = parseExternalReference(payment.externalReference);
    let lojaId = fromPayment.lojaId;
    let plano = fromPayment.plano;

    // Fallback: busca loja pela subscription
    const admin = createClient(supabaseUrl, serviceKey);
    const subscriptionId =
      payment.subscription ||
      payload.subscription?.id ||
      null;

    if (!lojaId && subscriptionId) {
      const { data: lojaBySub } = await admin
        .from("lojas")
        .select("id, asaas_plano_pendente, plano")
        .eq("asaas_subscription_id", subscriptionId)
        .maybeSingle();
      if (lojaBySub) {
        lojaId = lojaBySub.id;
        plano = plano || lojaBySub.asaas_plano_pendente || lojaBySub.plano;
      }
    }

    if (!lojaId && payment.customer) {
      const { data: lojaByCust } = await admin
        .from("lojas")
        .select("id, asaas_plano_pendente, plano")
        .eq("asaas_customer_id", payment.customer)
        .maybeSingle();
      if (lojaByCust) {
        lojaId = lojaByCust.id;
        plano = plano || lojaByCust.asaas_plano_pendente || lojaByCust.plano;
      }
    }

    if (lojaId && !plano) {
      const { data: loja } = await admin
        .from("lojas")
        .select("asaas_plano_pendente, plano")
        .eq("id", lojaId)
        .maybeSingle();
      plano = loja?.asaas_plano_pendente || loja?.plano || "essencial";
    }

    // Vigência: ~1 ciclo mensal a partir do pagamento (com folga)
    let expiraEm: string | null = null;
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const base = payment.clientPaymentDate || payment.paymentDate || payment.confirmedDate;
      const baseDate = base ? new Date(base) : new Date();
      expiraEm = addDaysIso(Number.isNaN(baseDate.getTime()) ? new Date() : baseDate, 31);
    }

    const { data, error } = await admin.rpc("aplicar_pagamento_asaas", {
      p_event_id: eventId,
      p_event_type: event,
      p_loja_id: lojaId,
      p_plano: plano && ["essencial", "profissional", "rede"].includes(plano) ? plano : "essencial",
      p_payment_id: payment.id ?? null,
      p_subscription_id: subscriptionId,
      p_expira_em: expiraEm,
      p_payload: payload,
    });

    if (error) {
      console.error("aplicar_pagamento_asaas", error);
      return json(500, { error: error.message });
    }

    return json(200, { ok: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    console.error("asaas-webhook", message);
    return json(500, { error: message });
  }
});
