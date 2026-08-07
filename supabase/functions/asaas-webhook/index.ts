import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseCreditosReference(ref: unknown): {
  lojaId: string | null;
  pacoteId: string | null;
  quantidade: number | null;
} {
  const raw = String(ref ?? "").trim();
  if (!raw.startsWith("creditos:")) {
    return { lojaId: null, pacoteId: null, quantidade: null };
  }
  const parts = raw.split(":");
  // creditos:lojaId:pacote_id:quantidade
  const lojaId = parts[1] || null;
  const pacoteId = parts[2] || null;
  const quantidade = Number(parts[3]);
  return {
    lojaId,
    pacoteId,
    quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : null,
  };
}

function parseExternalReference(ref: unknown): {
  lojaId: string | null;
  plano: string | null;
  ciclo: string | null;
} {
  const raw = String(ref ?? "").trim();
  if (!raw || raw.startsWith("creditos:")) {
    return { lojaId: null, plano: null, ciclo: null };
  }
  if (raw.includes(":")) {
    const [lojaId, plano, ciclo] = raw.split(":");
    const cicloOk = ciclo === "anual" || ciclo === "mensal" ? ciclo : null;
    return { lojaId: lojaId || null, plano: plano || null, ciclo: cicloOk };
  }
  return { lojaId: raw, plano: null, ciclo: null };
}

function addDaysIso(base: Date, days: number) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function diasVigencia(ciclo: string | null) {
  return ciclo === "anual" ? 366 : 31;
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
    const admin = createClient(supabaseUrl, serviceKey);

    // --- Pacotes de créditos (cobrança avulsa) ---
    const creditosRef = parseCreditosReference(payment.externalReference);
    if (creditosRef.lojaId) {
      const { data, error } = await admin.rpc("aplicar_pagamento_creditos_asaas", {
        p_event_id: eventId,
        p_event_type: event,
        p_loja_id: creditosRef.lojaId,
        p_payment_id: payment.id ?? null,
        p_quantidade: creditosRef.quantidade,
        p_pacote_id: creditosRef.pacoteId,
        p_payload: payload,
      });
      if (error) {
        console.error("aplicar_pagamento_creditos_asaas", error);
        return json(500, { error: error.message });
      }
      return json(200, { ok: true, kind: "creditos", result: data });
    }

    // --- Assinatura (plano) ---
    const fromPayment = parseExternalReference(payment.externalReference);
    let lojaId = fromPayment.lojaId;
    let plano = fromPayment.plano;
    let ciclo = fromPayment.ciclo;

    const subscriptionId =
      payment.subscription ||
      payload.subscription?.id ||
      null;

    if (!lojaId && subscriptionId) {
      const { data: lojaBySub } = await admin
        .from("lojas")
        .select("id, asaas_plano_pendente, asaas_ciclo_pendente, plano, assinatura_ciclo")
        .eq("asaas_subscription_id", subscriptionId)
        .maybeSingle();
      if (lojaBySub) {
        lojaId = lojaBySub.id;
        plano = plano || lojaBySub.asaas_plano_pendente || lojaBySub.plano;
        ciclo = ciclo || lojaBySub.asaas_ciclo_pendente || lojaBySub.assinatura_ciclo;
      }
    }

    if (!lojaId && payment.customer) {
      const { data: lojaByCust } = await admin
        .from("lojas")
        .select("id, asaas_plano_pendente, asaas_ciclo_pendente, plano, assinatura_ciclo")
        .eq("asaas_customer_id", payment.customer)
        .maybeSingle();
      if (lojaByCust) {
        lojaId = lojaByCust.id;
        plano = plano || lojaByCust.asaas_plano_pendente || lojaByCust.plano;
        ciclo = ciclo || lojaByCust.asaas_ciclo_pendente || lojaByCust.assinatura_ciclo;
      }
    }

    if (lojaId && (!plano || !ciclo)) {
      const { data: loja } = await admin
        .from("lojas")
        .select("asaas_plano_pendente, asaas_ciclo_pendente, plano, assinatura_ciclo")
        .eq("id", lojaId)
        .maybeSingle();
      plano = plano || loja?.asaas_plano_pendente || loja?.plano || "essencial";
      ciclo = ciclo || loja?.asaas_ciclo_pendente || loja?.assinatura_ciclo || "mensal";
    }

    if (!ciclo) ciclo = "mensal";
    if (ciclo !== "anual" && ciclo !== "mensal") ciclo = "mensal";

    let expiraEm: string | null = null;
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const base = payment.clientPaymentDate || payment.paymentDate || payment.confirmedDate;
      const baseDate = base ? new Date(base) : new Date();
      expiraEm = addDaysIso(
        Number.isNaN(baseDate.getTime()) ? new Date() : baseDate,
        diasVigencia(ciclo)
      );
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
      p_ciclo: ciclo,
    });

    if (error) {
      console.error("aplicar_pagamento_asaas", error);
      return json(500, { error: error.message });
    }

    return json(200, { ok: true, kind: "assinatura", result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    console.error("asaas-webhook", message);
    return json(500, { error: message });
  }
});
