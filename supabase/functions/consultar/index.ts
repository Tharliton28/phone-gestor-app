import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function calcIdade(nascimento: string | null | undefined) {
  if (!nascimento) return null;
  const raw = String(nascimento).trim();
  let y: number, m: number, d: number;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    [y, m, d] = raw.slice(0, 10).split("-").map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
    const parts = raw.slice(0, 10).split("/").map(Number);
    d = parts[0];
    m = parts[1];
    y = parts[2];
  } else {
    return null;
  }
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let idade = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) idade -= 1;
  return idade;
}

function formatDateBr(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return raw;
}

function toIsoBirthdate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "";
}

function getInfosimplesToken() {
  return String(
    Deno.env.get("INFOSIMPLES_TOKEN") ||
      Deno.env.get("CONSULTA_API_TOKEN") ||
      Deno.env.get("CONSULTA_CPF_TOKEN") ||
      "",
  ).trim();
}

async function callInfosimples(servicePath: string, params: Record<string, string>) {
  const token = getInfosimplesToken();
  if (!token) {
    const err = new Error(
      "API Infosimples não configurada. Defina INFOSIMPLES_TOKEN nos Secrets da Edge Function.",
    );
    (err as Error & { code?: string }).code = "provider_not_configured";
    throw err;
  }

  const body = new URLSearchParams({
    token,
    timeout: params.timeout || "90",
    ignore_site_receipt: "1",
    ...params,
  });

  const url = `https://api.infosimples.com/api/v2/consultas/${servicePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
  const code = Number(payload.code ?? 0);
  const header = (payload.header && typeof payload.header === "object")
    ? payload.header as Record<string, unknown>
    : {};
  const errors = Array.isArray(payload.errors) ? payload.errors.map(String) : [];
  const dataArr = Array.isArray(payload.data) ? payload.data as Record<string, unknown>[] : [];

  return { httpOk: res.ok, code, header, errors, dataArr, payload };
}

function mapCpfInfosimples(doc: string, row: Record<string, unknown>) {
  const nascimento = formatDateBr(row.data_nascimento || row.normalizado_data_nascimento);
  return {
    tipo: "cpf",
    cpf: doc,
    cnpj: "",
    nome: String(row.nome || row.nome_civil || row.nome_social || "—").trim() || "—",
    nascimento: nascimento || "—",
    idade: calcIdade(String(row.data_nascimento || row.normalizado_data_nascimento || "")) ?? "—",
    sexo: "—",
    nomeMae: "—",
    situacao: String(row.situacao_cadastral || "—").toUpperCase(),
    atualizadoEm: String(row.consulta_datahora || new Date().toLocaleString("pt-BR")),
    protocolo: String(row.consulta_comprovante || Date.now()),
    endereco: "—",
    rawSafe: {
      provider: "infosimples",
      service: "receita-federal/cpf",
    },
  };
}

function mapCnpjInfosimples(doc: string, row: Record<string, unknown>) {
  const endereco = [
    row.endereco_logradouro,
    row.endereco_numero,
    row.endereco_complemento,
    row.endereco_bairro,
    row.endereco_municipio,
    row.endereco_uf,
    row.endereco_cep,
  ].filter(Boolean).join(", ") || "—";

  return {
    tipo: "cnpj",
    cpf: "",
    cnpj: doc,
    nome: String(row.razao_social || row.nome_fantasia || "—").trim() || "—",
    nascimento: formatDateBr(row.abertura_data) || "—",
    idade: "—",
    sexo: "—",
    nomeMae: "—",
    situacao: String(row.situacao_cadastral || "—").toUpperCase(),
    atualizadoEm: String(row.consulta_datahora || new Date().toLocaleString("pt-BR")),
    protocolo: String(row.cnpj || Date.now()),
    endereco,
    fantasia: String(row.nome_fantasia || ""),
    telefone: String(row.telefone || ""),
    email: String(row.email || ""),
    rawSafe: {
      provider: "infosimples",
      service: "receita-federal/cnpj",
    },
  };
}

function mapImeiInfosimples(imei: string, row: Record<string, unknown>) {
  const resultado = String(row.resultado || "").trim();
  const lower = resultado.toLowerCase();
  const bloqueado = /impedido|roubo|furto|perda|blacklist|bloqueado/.test(lower);

  return {
    imei,
    situacao: bloqueado ? "ALERTA" : "OK",
    bloqueado,
    marca: "—",
    modelo: "—",
    mensagem: resultado || (bloqueado
      ? "Aparelho pode constar em lista de roubo/furto. Confira antes de comprar."
      : "Consulta Anatel concluída — sem indício de bloqueio."),
    responsavel: String(row.responsavel || "—"),
    protocolo: String(row.data_consulta || Date.now()),
    atualizadoEm: String(row.data_consulta || new Date().toLocaleString("pt-BR")),
    rawSafe: {
      provider: "infosimples",
      service: "anatel/celular-legal",
      resultado_url: row.resultado_url ?? null,
    },
  };
}

async function consultarCpfCnpjExterno(documento: string, birthdate?: string) {
  if (documento.length === 11) {
    const iso = toIsoBirthdate(birthdate);
    if (!iso) {
      const err = new Error("Para consultar CPF na Receita Federal, informe a data de nascimento.");
      (err as Error & { code?: string }).code = "birthdate_required";
      throw err;
    }

    const { code, errors, dataArr, header } = await callInfosimples("receita-federal/cpf", {
      cpf: documento,
      birthdate: iso,
    });

    if (code !== 200 || !dataArr[0]) {
      const err = new Error(errors.join("; ") || `Consulta CPF falhou (código ${code}).`);
      (err as Error & { code?: string; billable?: boolean }).code = `infosimples_${code}`;
      (err as Error & { billable?: boolean }).billable = Boolean(header.billable);
      throw err;
    }

    return mapCpfInfosimples(documento, dataArr[0]);
  }

  const { code, errors, dataArr, header } = await callInfosimples("receita-federal/cnpj", {
    cnpj: documento,
  });

  if (code !== 200 || !dataArr[0]) {
    const err = new Error(errors.join("; ") || `Consulta CNPJ falhou (código ${code}).`);
    (err as Error & { code?: string; billable?: boolean }).code = `infosimples_${code}`;
    (err as Error & { billable?: boolean }).billable = Boolean(header.billable);
    throw err;
  }

  return mapCnpjInfosimples(documento, dataArr[0]);
}

async function consultarImeiExterno(imei: string) {
  const { code, errors, dataArr, header } = await callInfosimples("anatel/celular-legal", {
    imei,
  });

  if (code !== 200 || !dataArr[0]) {
    const err = new Error(errors.join("; ") || `Consulta IMEI falhou (código ${code}).`);
    (err as Error & { code?: string; billable?: boolean }).code = `infosimples_${code}`;
    (err as Error & { billable?: boolean }).billable = Boolean(header.billable);
    throw err;
  }

  return mapImeiInfosimples(imei, dataArr[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Método não permitido." });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Não autenticado." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json(401, { error: "Sessão inválida." });

    const body = await req.json().catch(() => ({}));
    const lojaId = String(body.lojaId || "").trim();
    const tipo = String(body.tipo || "").trim();
    const documentoRaw = String(body.documento || body.imei || "").trim();
    const birthdate = String(body.birthdate || body.dataNascimento || "").trim();

    if (!lojaId) return json(400, { error: "lojaId obrigatório." });
    if (tipo !== "cpf_cnpj" && tipo !== "imei") {
      return json(400, { error: "tipo inválido. Use cpf_cnpj ou imei." });
    }

    const { data: ent } = await userClient.rpc("loja_entitlements", { p_loja_id: lojaId });
    if (!ent?.ok) return json(403, { error: ent?.error || "Sem acesso à loja." });
    if (!ent.assinatura_ativa) return json(403, { error: "Assinatura inativa." });

    const { data: permit, error: permitErr } = await userClient.rpc("checar_consulta_permitida", {
      p_loja_id: lojaId,
      p_tipo: tipo,
    });
    if (permitErr) return json(400, { error: permitErr.message });
    if (!permit?.ok) {
      const code = String(permit?.code || "plan_locked");
      const status = code === "trial_limit" ? 403 : code === "subscription_inactive" ? 403 : 403;
      return json(status, {
        error: permit?.error || "Consulta não permitida.",
        code,
        usados: permit?.usados ?? null,
        limite: permit?.limite ?? null,
        restantes: permit?.restantes ?? null,
      });
    }

    const modoTrial = permit.mode === "trial";

    if (!getInfosimplesToken()) {
      return json(503, {
        error: "API Infosimples não configurada. Defina INFOSIMPLES_TOKEN nos Secrets.",
        code: "provider_not_configured",
      });
    }

    const acao = tipo === "imei" ? "consulta_imei" : "consulta_cpf_cnpj";
    const chave = onlyDigits(documentoRaw);

    if (tipo === "cpf_cnpj" && chave.length !== 11 && chave.length !== 14) {
      return json(400, { error: "Informe um CPF (11) ou CNPJ (14) válido." });
    }
    if (tipo === "cpf_cnpj" && chave.length === 11 && !toIsoBirthdate(birthdate)) {
      return json(400, {
        error: "Para consultar CPF, informe a data de nascimento.",
        code: "birthdate_required",
      });
    }
    if (tipo === "imei" && chave.length !== 15) {
      return json(400, { error: "IMEI deve ter 15 dígitos." });
    }

    let custo = tipo === "imei" ? 2 : 1;
    if (!modoTrial) {
      const { data: carteira, error: cartError } = await userClient.rpc("obter_loja_creditos", {
        p_loja_id: lojaId,
      });
      if (cartError) return json(400, { error: cartError.message });

      const { data: custoRow } = await userClient
        .from("loja_credito_custos")
        .select("creditos")
        .eq("acao", acao)
        .eq("ativo", true)
        .maybeSingle();
      custo = Number(custoRow?.creditos ?? custo);
      if (Number(carteira?.saldo ?? 0) < custo) {
        return json(402, {
          error: `Saldo insuficiente. Esta consulta custa ${custo} crédito(s). Saldo atual: ${carteira?.saldo ?? 0}.`,
          code: "insufficient_credits",
          custo,
          saldo: carteira?.saldo ?? 0,
        });
      }
    } else {
      custo = 0;
    }

    let resultado: Record<string, unknown>;
    try {
      resultado = tipo === "imei"
        ? await consultarImeiExterno(chave)
        : await consultarCpfCnpjExterno(chave, birthdate);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      await admin.from("consulta_logs").insert({
        loja_id: lojaId,
        usuario_id: userData.user.id,
        tipo,
        chave,
        provider: "infosimples",
        sucesso: false,
        creditos_consumidos: 0,
        mensagem: (err as Error).message,
      });
      const status = code === "provider_not_configured"
        ? 503
        : code === "birthdate_required"
        ? 400
        : 502;
      return json(status, {
        error: (err as Error).message,
        code: code || "provider_error",
      });
    }

    let situacaoLoja: Record<string, unknown> | null = null;
    if (tipo === "cpf_cnpj") {
      const { data: pessoa } = await userClient
        .from("pessoas")
        .select("id, nome")
        .eq("loja_id", lojaId)
        .eq("cpf_cnpj", chave)
        .maybeSingle();

      if (pessoa?.id) {
        const { data: pendentes } = await userClient
          .from("lancamentos_financeiros")
          .select("id, valor, status, vencimento, descricao")
          .eq("loja_id", lojaId)
          .eq("pessoa_id", pessoa.id)
          .eq("tipo", "receber")
          .eq("status", "pendente");

        const totalPendente = (pendentes ?? []).reduce((acc, row) => acc + Number(row.valor || 0), 0);
        situacaoLoja = {
          pessoaId: pessoa.id,
          emDia: totalPendente <= 0,
          titulosPendentes: (pendentes ?? []).length,
          valorPendente: totalPendente,
          resumo: totalPendente <= 0
            ? "Em dia com a loja (sem títulos a receber em aberto)."
            : `Possui ${(pendentes ?? []).length} título(s) em aberto na loja (R$ ${totalPendente.toFixed(2)}).`,
        };
      } else {
        situacaoLoja = {
          pessoaId: null,
          emDia: true,
          titulosPendentes: 0,
          valorPendente: 0,
          resumo: "Pessoa ainda não cadastrada nesta loja — sem histórico financeiro local.",
        };
      }
    }

    // Debita créditos só no plano pago; trial usa cota gratuita
    let consumido = 0;
    let saldoAtual: number | null = null;
    if (!modoTrial) {
      const { data: credito, error: creditoError } = await userClient.rpc("consumir_loja_creditos", {
        p_loja_id: lojaId,
        p_acao: acao,
        p_quantidade: null,
        p_descricao: tipo === "imei" ? `Consulta IMEI ${chave}` : `Consulta CPF/CNPJ ${chave}`,
        p_referencia_tipo: "consulta",
        p_referencia_id: null,
      });

      if (creditoError) {
        return json(402, { error: creditoError.message, code: "credit_debit_failed" });
      }
      consumido = Number(credito?.consumido ?? custo);
      saldoAtual = typeof credito?.saldo === "number" ? credito.saldo : null;
    }

    await admin.from("consulta_logs").insert({
      loja_id: lojaId,
      usuario_id: userData.user.id,
      tipo,
      chave,
      provider: "infosimples",
      sucesso: true,
      creditos_consumidos: consumido,
      mensagem: modoTrial ? "ok_trial" : "ok",
    });

    return json(200, {
      ok: true,
      tipo,
      mode: modoTrial ? "trial" : "credits",
      custo: consumido,
      saldo: saldoAtual,
      trial: modoTrial
        ? {
          usados: Number(permit.usados ?? 0) + 1,
          limite: permit.limite ?? null,
          restantes: Math.max(0, Number(permit.restantes ?? 1) - 1),
        }
        : null,
      dados: resultado,
      situacaoLoja,
    });
  } catch (err) {
    return json(500, { error: (err as Error).message || "Erro interno na consulta." });
  }
});
