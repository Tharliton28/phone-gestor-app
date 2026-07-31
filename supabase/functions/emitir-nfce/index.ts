import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function mapFormaPagamentoFocus(tipoDb: string | null | undefined) {
  const map: Record<string, string> = {
    dinheiro: "01",
    cheque: "02",
    credito: "03",
    debito: "04",
    pix: "17",
    boleto: "15",
    aparelho_troca: "99",
    outros: "99",
  };
  return map[tipoDb ?? ""] ?? "99";
}

function dataEmissaoIso(agora = new Date()) {
  const offsetMin = -agora.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const tzH = String(Math.floor(abs / 60)).padStart(2, "0");
  const tzM = String(abs % 60).padStart(2, "0");
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}T${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}:${String(agora.getSeconds()).padStart(2, "0")}${sign}${tzH}:${tzM}`;
}

function buildPayload(loja: Record<string, unknown>, venda: Record<string, unknown>, serie: number, numero: number) {
  const cnpjEmitente = onlyDigits(String(loja.cnpj ?? ""));
  if (cnpjEmitente.length !== 14) {
    throw new Error("CNPJ da loja inválido ou não cadastrado.");
  }

  const itens = (venda.itens as Array<Record<string, unknown>>) ?? [];
  if (!itens.length) throw new Error("Venda sem itens para NFC-e.");

  const items = itens.map((item, index) => {
    const produto = (item.produto as Record<string, unknown>) ?? {};
    const ncm = onlyDigits(String(produto.ncm ?? ""));
    if (ncm.length !== 8) {
      throw new Error(
        `Produto "${item.descricao || produto.nome || index + 1}" sem NCM válido (8 dígitos). Cadastre em Produtos → Fiscal.`,
      );
    }
    const qtd = Number(item.quantidade) || 1;
    const unit = Number(item.valor_unitario) || 0;
    const bruto = Number(item.valor_total) || qtd * unit;
    const unidade = String(produto.unidade || "UN").slice(0, 6);
    const cfop = onlyDigits(String(produto.cfop || "5102")) || "5102";

    return {
      numero_item: String(index + 1),
      codigo_produto: String(produto.codigo ?? item.produto_id ?? index + 1),
      codigo_ncm: ncm,
      descricao: String(item.descricao || produto.nome || "Produto").slice(0, 120),
      quantidade_comercial: qtd,
      quantidade_tributavel: qtd,
      unidade_comercial: unidade,
      unidade_tributavel: unidade,
      valor_unitario_comercial: unit,
      valor_unitario_tributavel: unit,
      valor_bruto: bruto,
      cfop,
      icms_origem: String(produto.icms_origem ?? "0"),
      icms_situacao_tributaria: String(produto.icms_situacao_tributaria ?? "102"),
    };
  });

  const pagamentos = (venda.pagamentos as Array<Record<string, unknown>>) ?? [];
  const formas = pagamentos
    .map((pag) => {
      const forma = (pag.forma as Record<string, unknown>) ?? {};
      return {
        forma_pagamento: mapFormaPagamentoFocus(String(forma.tipo ?? "outros")),
        valor_pagamento: Number(pag.valor) || 0,
      };
    })
    .filter((f) => f.valor_pagamento > 0);

  if (!formas.length) {
    formas.push({
      forma_pagamento: "99",
      valor_pagamento: Number(venda.valor_total) || 0,
    });
  }

  const payload: Record<string, unknown> = {
    cnpj_emitente: cnpjEmitente,
    data_emissao: dataEmissaoIso(),
    natureza_operacao: "VENDA AO CONSUMIDOR",
    local_destino: "1",
    presenca_comprador: "1",
    modalidade_frete: "9",
    indicador_inscricao_estadual_destinatario: "9",
    serie: String(serie),
    numero: String(numero),
    items,
    formas_pagamento: formas,
  };

  const cliente = (venda.cliente as Record<string, unknown>) ?? null;
  if (cliente?.nome) payload.nome_destinatario = cliente.nome;
  const doc = onlyDigits(String(cliente?.cpf_cnpj ?? ""));
  if (doc.length === 11) payload.cpf_destinatario = doc;
  if (doc.length === 14) payload.cnpj_destinatario = doc;

  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lojaId, vendaId, forcar = false } = await req.json();
    if (!lojaId || !vendaId) {
      return new Response(JSON.stringify({ error: "lojaId e vendaId são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await userClient
      .from("usuario_lojas")
      .select("loja_id")
      .eq("loja_id", lojaId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Sem acesso a esta loja." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await userClient
      .from("loja_configuracoes")
      .select("fiscal_provider, fiscal_emitir_nfce_auto, nfe_ambiente, nfce_serie, nfce_ultimo_numero")
      .eq("loja_id", lojaId)
      .maybeSingle();

    if (!forcar && !config?.fiscal_emitir_nfce_auto) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((config?.fiscal_provider ?? "mock") !== "focus") {
      return new Response(JSON.stringify({ error: "Provedor fiscal da loja não é Focus." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: secret } = await admin
      .from("loja_fiscal_secrets")
      .select("focus_nfe_token")
      .eq("loja_id", lojaId)
      .maybeSingle();

    const token = secret?.focus_nfe_token?.trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token Focus não configurado. Vá em Configurações → Fiscal." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existente } = await userClient
      .from("documentos_fiscais")
      .select("*")
      .eq("loja_id", lojaId)
      .eq("venda_id", vendaId)
      .eq("tipo", "nfce")
      .in("status", ["autorizado", "mock"])
      .maybeSingle();

    if (existente) {
      return new Response(JSON.stringify({ data: existente, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: saldoData, error: saldoError } = await userClient.rpc("obter_loja_creditos", {
      p_loja_id: lojaId,
    });
    if (saldoError) {
      return new Response(JSON.stringify({ error: saldoError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((saldoData?.saldo ?? 0) < 4) {
      return new Response(JSON.stringify({ error: `Créditos insuficientes (precisa de 4, saldo ${saldoData?.saldo ?? 0}).` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: loja, error: lojaError } = await userClient
      .from("lojas")
      .select("id, cnpj, razao_social, nome_fantasia, inscricao_estadual, regime_tributario, cidade, estado")
      .eq("id", lojaId)
      .single();

    if (lojaError || !loja) {
      return new Response(JSON.stringify({ error: "Loja não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: venda, error: vendaError } = await userClient
      .from("vendas")
      .select(`
        id, codigo, valor_total, valor_desconto,
        cliente:pessoas (id, nome, cpf_cnpj),
        itens:venda_itens (
          id, produto_id, descricao, quantidade, valor_unitario, valor_total,
          produto:produtos (id, nome, codigo, ncm, cfop, unidade, icms_origem, icms_situacao_tributaria, ean)
        ),
        pagamentos:venda_pagamentos (
          id, valor, forma:formas_pagamento (id, tipo, nome)
        )
      `)
      .eq("loja_id", lojaId)
      .eq("id", vendaId)
      .maybeSingle();

    if (vendaError || !venda) {
      return new Response(JSON.stringify({ error: "Venda não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reserva, error: reservaError } = await userClient.rpc("reservar_proximo_numero_nfce", {
      p_loja_id: lojaId,
    });
    if (reservaError) {
      return new Response(JSON.stringify({ error: reservaError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serie = Number(reserva.serie) || 1;
    const numero = Number(reserva.numero);
    const ambiente = reserva.ambiente ?? config?.nfe_ambiente ?? "homologacao";
    const ref = `pg-${lojaId.slice(0, 8)}-${vendaId.slice(0, 8)}-${numero}`;

    let payload: Record<string, unknown>;
    try {
      payload = buildPayload(loja, venda, serie, numero);
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rascunho, error: insertError } = await userClient
      .from("documentos_fiscais")
      .insert({
        loja_id: lojaId,
        venda_id: vendaId,
        tipo: "nfce",
        ambiente,
        serie,
        numero,
        status: "processando",
        provider: "focus",
        provider_ref: ref,
        valor_total: venda.valor_total,
        mensagem: "Enviando à Focus NFe…",
      })
      .select("*")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = ambiente === "producao"
      ? "https://api.focusnfe.com.br/v2"
      : "https://homologacao.focusnfe.com.br/v2";

    const basic = btoa(`${token}:`);
    const focusRes = await fetch(`${baseUrl}/nfce?ref=${encodeURIComponent(ref)}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const focusJson = await focusRes.json().catch(() => ({}));
    const autorizado = focusJson?.status === "autorizado";

    let consumiu = 0;
    if (autorizado) {
      const { data: credito, error: creditoError } = await userClient.rpc("consumir_loja_creditos", {
        p_loja_id: lojaId,
        p_acao: "nfce_emissao",
        p_quantidade: null,
        p_descricao: `NFC-e ${serie}/${numero}`,
        p_referencia_tipo: "documento_fiscal",
        p_referencia_id: rascunho.id,
      });
      if (creditoError) {
        await userClient.from("documentos_fiscais").update({
          status: "rejeitado",
          mensagem: `Autorizada na Focus, mas falha ao debitar créditos: ${creditoError.message}`,
          chave_acesso: focusJson.chave_nfe ?? null,
          protocolo: focusJson.status_sefaz ?? null,
          caminho_xml: focusJson.caminho_xml_nota_fiscal ?? null,
          caminho_danfe: focusJson.caminho_danfe ?? null,
          qrcode_url: focusJson.qrcode_url ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", rascunho.id);

        return new Response(JSON.stringify({ error: creditoError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      consumiu = credito?.consumido ?? 4;
    }

    const statusFinal = autorizado ? "autorizado" : "rejeitado";
    const mensagem = focusJson.mensagem_sefaz
      || focusJson.mensagem
      || (autorizado ? "Autorizado" : "Rejeitado pela SEFAZ/Focus");

    const { data: atualizado, error: updateError } = await userClient
      .from("documentos_fiscais")
      .update({
        status: statusFinal,
        chave_acesso: focusJson.chave_nfe ?? null,
        protocolo: focusJson.status_sefaz ?? null,
        mensagem,
        provider_ref: ref,
        caminho_xml: focusJson.caminho_xml_nota_fiscal ?? null,
        caminho_danfe: focusJson.caminho_danfe ?? null,
        qrcode_url: focusJson.qrcode_url ?? null,
        consumiu_creditos: consumiu,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rascunho.id)
      .select("*")
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!autorizado) {
      return new Response(JSON.stringify({ data: atualizado, error: mensagem }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: atualizado, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
