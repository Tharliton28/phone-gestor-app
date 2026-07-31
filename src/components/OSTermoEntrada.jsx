import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileCheck, Eraser, ShieldCheck, Link2, RefreshCw, Copy, Smartphone,
  MessageCircle, FileDown, CheckCircle2, Circle, X,
} from 'lucide-react';
import AssinaturaCanvas from './AssinaturaCanvas';
import OSFotosUpload from './OSFotosUpload';
import { useDialog } from '../contexts/DialogContext';
import { buildWhatsAppLink, montarMensagemAceite, calcChecklistEvidencias } from '../domain/osEvidencias';
import { imprimirViaCliente, montarHtmlViaCliente } from '../utils/osTermoPdf';
import {
  abrirViaArquivada,
  arquivarViaHtml,
  criarLinkAceiteCliente,
  getLinkAceitePendente,
  getOsEvidencias,
  registrarTermoEntrada,
  registrarTermoSaida,
  substituirVariaveisTermo,
  TERMO_OS_PADRAO,
  TERMO_OS_SAIDA_PADRAO,
} from '../services/osEvidenciaService';
import { formatCpfCnpj, onlyDigits } from '../utils/formatters';

const LABELS = {
  entrada: { titulo: 'Termo de entrada', fotos: 'entrada', acao: 'entrada do aparelho' },
  saida: { titulo: 'Termo de saída', fotos: 'saída', acao: 'retirada do aparelho' },
};

export default function OSTermoEntrada({
  lojaId,
  osId,
  codigo,
  form,
  clienteNome,
  clienteTelefone = '',
  nomeEmpresa = 'Loja',
  cnpjEmpresa = '',
  termoTemplate,
  exigirTermo = true,
  exigirFoto = true,
  somenteLeitura = false,
  operadorId,
  onRegistrado,
  tipo = 'entrada',
  apiRef,
}) {
  const labels = LABELS[tipo] ?? LABELS.entrada;
  const { alert } = useDialog();
  const assinaturaRef = useRef(null);
  const fotosApiRef = useRef(null);
  const sequenciaRef = useRef(0);
  const jaCarregouRef = useRef(false);
  const termoAnteriorRef = useRef(undefined);
  const [aceito, setAceito] = useState(false);
  const [evidencias, setEvidencias] = useState(null);
  const [carregandoInicial, setCarregandoInicial] = useState(Boolean(osId));
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [linkCliente, setLinkCliente] = useState(null);
  const [modoAssinatura, setModoAssinatura] = useState('cliente');
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [destaqueAssinatura, setDestaqueAssinatura] = useState(false);
  const [arquivandoVia, setArquivandoVia] = useState(false);

  const telefoneWhatsApp = onlyDigits(clienteTelefone);

  const onRegistradoRef = useRef(onRegistrado);
  const linkClienteRef = useRef(linkCliente);
  const alertRef = useRef(alert);

  useEffect(() => {
    onRegistradoRef.current = onRegistrado;
    linkClienteRef.current = linkCliente;
    alertRef.current = alert;
  }, [onRegistrado, linkCliente, alert]);

  // Repassa o controle das fotos ao formulário da OS, que as envia ao salvar.
  useEffect(() => {
    if (!apiRef) return undefined;

    apiRef.current = {
      temFotosPendentes: () => Boolean(fotosApiRef.current?.temFotosPendentes()),
      flushFotosPendentes: async (osIdNovo) => (
        (await fotosApiRef.current?.flushFotosPendentes(osIdNovo)) ?? { ok: true, salvas: 0, error: null }
      ),
    };

    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  const termoRenderizado = useMemo(() => {
    const padrao = tipo === 'saida' ? TERMO_OS_SAIDA_PADRAO : TERMO_OS_PADRAO;
    const template = termoTemplate?.trim() || padrao;
    return substituirVariaveisTermo(template, {
      nomeEmpresa,
      cnpjEmpresa,
      nomeCliente: clienteNome ?? '—',
      codigoOs: codigo ?? '—',
      modeloAparelho: form?.aparelhoModelo ?? '—',
      imei: form?.aparelhoImei ?? '—',
      dataEntrada: new Date().toLocaleDateString('pt-BR'),
    });
  }, [termoTemplate, tipo, nomeEmpresa, cnpjEmpresa, clienteNome, codigo, form?.aparelhoModelo, form?.aparelhoImei]);

  const checklist = useMemo(
    () => calcChecklistEvidencias({
      termo: evidencias?.termo,
      fotos: evidencias?.fotos,
      exigirTermo,
      exigirFoto,
    }),
    [evidencias, exigirTermo, exigirFoto]
  );

  // osIdAlvo permite recarregar logo após a criação da OS, sem depender do
  // prop já ter chegado neste render.
  const carregar = useCallback(async ({ silencioso = false, osIdAlvo = null } = {}) => {
    const alvo = osIdAlvo ?? osId;
    if (!lojaId || !alvo) return;

    // Duas cargas podem estar em voo (troca de osId e recarga pós-upload).
    // Sem esta ordenação, a resposta antiga chega depois e apaga as fotos da tela.
    const sequencia = sequenciaRef.current + 1;
    sequenciaRef.current = sequencia;

    if (silencioso) {
      setAtualizando(true);
    } else {
      setCarregandoInicial(true);
    }

    const { termo, fotos, assinaturaUrl, error } = await getOsEvidencias(lojaId, alvo, tipo);

    if (sequencia === sequenciaRef.current) {
      if (error) {
        setErro(error.message ?? 'Erro ao carregar evidências.');
      } else {
        setEvidencias({ termo, fotos, assinaturaUrl });

        if (termo) {
          onRegistradoRef.current?.();
        } else if (!linkClienteRef.current) {
          const link = await getLinkAceitePendente(lojaId, alvo, tipo);
          if (link.url) setLinkCliente(link.url);
        }
      }
    }

    if (silencioso) {
      setAtualizando(false);
    } else {
      setCarregandoInicial(false);
    }
  }, [lojaId, osId, tipo]);

  // Só a primeira carga bloqueia a tela. Recarregar em silêncio evita desmontar o
  // bloco de fotos e descartar imagens que o operador ainda não enviou.
  useEffect(() => {
    carregar({ silencioso: jaCarregouRef.current });
    jaCarregouRef.current = true;
  }, [carregar]);

  useEffect(() => {
    if (!linkCliente || evidencias?.termo) return undefined;
    const timer = setInterval(() => carregar({ silencioso: true }), 8000);
    return () => clearInterval(timer);
  }, [linkCliente, evidencias?.termo, carregar]);

  // Transição "ainda sem termo → termo aparece" = cliente (ou balcão) acabou de assinar.
  useEffect(() => {
    const termoAtual = evidencias?.termo ?? null;
    const anterior = termoAnteriorRef.current;

    if (anterior === undefined) {
      termoAnteriorRef.current = termoAtual;
      return;
    }

    if (!anterior && termoAtual) {
      setDestaqueAssinatura(true);
      setLinkCliente(null);

      const origem = termoAtual.origem_assinatura === 'cliente'
        ? 'no dispositivo do cliente'
        : 'no balcão da loja';
      const ip = termoAtual.ip_cliente ? `\nIP: ${termoAtual.ip_cliente}` : '';
      const cpf = termoAtual.cpf_cliente ? `\nCPF: ${formatCpfCnpj(termoAtual.cpf_cliente)}` : '';

      alertRef.current(
        `O ${labels.titulo.toLowerCase()} foi assinado ${origem}.${ip}${cpf}\n\nPróximo passo: imprima a via do cliente.`,
        { type: 'success', title: 'Assinatura recebida', confirmLabel: 'Entendi' }
      );

      // Arquiva comprovante em background (não bloqueia o alerta).
      if (lojaId && osId && termoAtual.id && !termoAtual.via_html_storage_path) {
        montarHtmlViaCliente({
          tipo,
          termo: termoAtual,
          fotos: evidencias?.fotos ?? [],
          assinaturaUrl: evidencias?.assinaturaUrl ?? null,
          termoTextoFallback: termoAtual.termo_texto,
          codigoOs: codigo,
          nomeCliente: clienteNome,
          empresa: { nome: nomeEmpresa, cnpj: cnpjEmpresa },
        }).then(({ html }) => {
          if (!html) return;
          return arquivarViaHtml({ lojaId, osId, termoId: termoAtual.id, html });
        }).then((result) => {
          if (result?.path) {
            setEvidencias((prev) => (
              prev?.termo
                ? { ...prev, termo: { ...prev.termo, via_html_storage_path: result.path } }
                : prev
            ));
          }
        }).catch(() => {});
      }
    }

    termoAnteriorRef.current = termoAtual;
  }, [
    evidencias?.termo,
    evidencias?.fotos,
    evidencias?.assinaturaUrl,
    labels.titulo,
    lojaId,
    osId,
    tipo,
    codigo,
    clienteNome,
    nomeEmpresa,
    cnpjEmpresa,
  ]);

  /**
   * O cliente não deve assinar um termo cujas fotos ainda não estão gravadas:
   * o documento afirma que ele está ciente do estado registrado na OS.
   */
  const selarFotosAntesDoAceite = async () => {
    let totalFotos = evidencias?.fotos?.length ?? 0;

    if (fotosApiRef.current?.temFotosPendentes()) {
      setErro(null);
      const upload = await fotosApiRef.current.flushFotosPendentes();

      if (!upload.ok) {
        setErro(`As fotos precisam ser salvas antes do aceite do cliente: ${upload.error?.message ?? 'erro no envio'}`);
        return false;
      }

      totalFotos += upload.salvas;
      setSucesso(`${upload.salvas} foto(s) salva(s) antes do aceite.`);
    }

    // O cliente assina declarando que conferiu as fotos. Sem foto, a declaração é vazia.
    if (exigirFoto && totalFotos === 0) {
      setErro(
        `Registre ao menos uma foto da ${labels.fotos} antes de pedir o aceite: o termo declara que o cliente conferiu as fotos do aparelho.`
      );
      return false;
    }

    return true;
  };

  const obterOuCriarLink = async ({ forcarNovo = false } = {}) => {
    if (!lojaId || !osId) return null;

    if (!await selarFotosAntesDoAceite()) return null;

    if (linkCliente && !forcarNovo) return linkCliente;

    const { url, error } = await criarLinkAceiteCliente({
      lojaId,
      osId,
      termoTexto: termoRenderizado,
      operadorId,
      tipo,
    });

    if (error) {
      setErro(error.message ?? 'Não foi possível gerar o link.');
      return null;
    }

    setLinkCliente(url);
    return url;
  };

  const gerarLinkCliente = async () => {
    if (!lojaId || !osId) return;

    setGerandoLink(true);
    setErro(null);
    await obterOuCriarLink({ forcarNovo: true });
    setGerandoLink(false);
  };

  const copiarLink = async () => {
    setGerandoLink(true);
    setErro(null);
    const url = await obterOuCriarLink();
    setGerandoLink(false);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setSucesso('Link copiado. Envie ao cliente por qualquer canal.');
  };

  /** Gera o link (se ainda não existir) e abre o WhatsApp — é o caminho jurídico recomendado. */
  const enviarWhatsApp = async () => {
    if (telefoneWhatsApp.length < 10) {
      setErro('Cadastre o telefone/WhatsApp do cliente em Pessoas → Clientes para enviar o link.');
      return;
    }

    setGerandoLink(true);
    setErro(null);
    const url = await obterOuCriarLink();
    setGerandoLink(false);
    if (!url) return;

    const msg = montarMensagemAceite({
      nomeCliente: clienteNome,
      codigoOs: codigo,
      nomeEmpresa,
      url,
      tipo,
    });
    window.open(buildWhatsAppLink(clienteTelefone, msg), '_blank', 'noopener,noreferrer');
  };

  const paramsVia = () => ({
    tipo,
    termo: evidencias?.termo ?? null,
    fotos: evidencias?.fotos ?? [],
    assinaturaUrl: evidencias?.assinaturaUrl ?? null,
    termoTextoFallback: termoRenderizado,
    codigoOs: codigo,
    nomeCliente: clienteNome,
    empresa: { nome: nomeEmpresa, cnpj: cnpjEmpresa },
  });

  const garantirArquivoVia = async (termoAtual = evidencias?.termo) => {
    if (!lojaId || !osId || !termoAtual?.id || termoAtual.via_html_storage_path) {
      return termoAtual?.via_html_storage_path ?? null;
    }

    setArquivandoVia(true);
    const { html, error: htmlError } = await montarHtmlViaCliente({
      ...paramsVia(),
      termo: termoAtual,
    });

    if (!html || htmlError) {
      setArquivandoVia(false);
      return null;
    }

    const { path, error } = await arquivarViaHtml({
      lojaId,
      osId,
      termoId: termoAtual.id,
      html,
    });
    setArquivandoVia(false);

    if (!error && path) {
      setEvidencias((prev) => (
        prev?.termo
          ? { ...prev, termo: { ...prev.termo, via_html_storage_path: path } }
          : prev
      ));
    }

    return path;
  };

  const baixarPdf = async () => {
    setGerandoPdf(true);
    setErro(null);

    const { ok, error, html } = await imprimirViaCliente(paramsVia());

    if (ok && evidencias?.termo?.id && html && !evidencias.termo.via_html_storage_path) {
      await arquivarViaHtml({
        lojaId,
        osId,
        termoId: evidencias.termo.id,
        html,
      }).then(({ path }) => {
        if (path) {
          setEvidencias((prev) => (
            prev?.termo
              ? { ...prev, termo: { ...prev.termo, via_html_storage_path: path } }
              : prev
          ));
        }
      });
    }

    setGerandoPdf(false);

    if (!ok) setErro(error?.message ?? 'Não foi possível gerar a via do cliente.');
  };

  const abrirComprovante = async () => {
    setErro(null);
    const path = await garantirArquivoVia();
    if (!path) {
      setErro('Não foi possível abrir o comprovante arquivado. Use imprimir via.');
      return;
    }
    const { error } = await abrirViaArquivada(path);
    if (error) setErro(error.message ?? 'Erro ao abrir comprovante.');
  };

  const registrarAssinaturaLoja = async () => {
    if (!lojaId || !osId) return;

    setErro(null);

    if (exigirTermo && !aceito) {
      setErro('O cliente precisa aceitar o termo.');
      return;
    }

    if (assinaturaRef.current?.isEmpty()) {
      setErro('Capture a assinatura do cliente.');
      return;
    }

    if (!await selarFotosAntesDoAceite()) return;

    setSalvando(true);
    const registrar = tipo === 'saida' ? registrarTermoSaida : registrarTermoEntrada;
    const { error: termoError } = await registrar({
      lojaId,
      osId,
      termoTexto: termoRenderizado,
      assinaturaDataUrl: assinaturaRef.current?.getDataUrl(),
      operadorId,
    });
    setSalvando(false);

    if (termoError) {
      setErro(termoError.message ?? 'Erro ao registrar termo.');
      return;
    }

    setAceito(false);
    assinaturaRef.current?.limpar();
    await carregar({ silencioso: true });
  };

  if (carregandoInicial) {
    return <div style={styles.loading}>Carregando {labels.titulo.toLowerCase()}...</div>;
  }

  const termo = evidencias?.termo ?? null;
  const origemAssinatura = termo?.origem_assinatura === 'cliente' ? 'dispositivo do cliente' : 'balcão da loja';
  const cpfFormatado = termo?.cpf_cliente ? formatCpfCnpj(termo.cpf_cliente) : null;

  return (
    <div style={styles.section}>
      <h3 style={styles.title}>
        {termo ? (
          <>
            <ShieldCheck size={16} color="#4ade80" /> {labels.titulo} registrado
          </>
        ) : (
          <>
            <FileCheck size={16} color="#38bdf8" /> {labels.titulo} e evidências
          </>
        )}
        {atualizando && <span style={styles.atualizandoBadge}>Atualizando…</span>}
      </h3>

      {termo ? (
        <div style={destaqueAssinatura ? styles.bannerAssinaturaDestaque : styles.bannerAssinatura}>
          {destaqueAssinatura && (
            <button
              type="button"
              style={styles.bannerFechar}
              onClick={() => setDestaqueAssinatura(false)}
              title="Dispensar"
            >
              <X size={14} />
            </button>
          )}
          <div style={styles.bannerAssinaturaTopo}>
            <CheckCircle2 size={22} color="#4ade80" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.bannerTitulo}>
                {destaqueAssinatura
                  ? `Cliente acabou de assinar o ${labels.titulo.toLowerCase()}`
                  : `${labels.titulo} assinado com sucesso`}
              </p>
              <p style={styles.bannerSub}>
                Aceito em {new Date(termo.aceito_em).toLocaleString('pt-BR')} · via {origemAssinatura}
              </p>
            </div>
          </div>
          <div style={styles.bannerChips}>
            {termo.ip_cliente && <span style={styles.chip}>IP {termo.ip_cliente}</span>}
            {cpfFormatado && <span style={styles.chip}>CPF {cpfFormatado}</span>}
            <span style={styles.chip}>{(evidencias?.fotos?.length ?? 0)} foto(s)</span>
          </div>
          <div style={styles.bannerAcoes}>
            <button
              type="button"
              style={styles.btnImprimirVia}
              onClick={async () => {
                await baixarPdf();
                setDestaqueAssinatura(false);
              }}
              disabled={gerandoPdf}
            >
              <FileDown size={16} />
              {gerandoPdf ? 'Preparando via...' : 'Imprimir via do cliente assinada'}
            </button>
            <button
              type="button"
              style={styles.btnSecondary}
              onClick={abrirComprovante}
              disabled={arquivandoVia}
            >
              {arquivandoVia ? 'Arquivando...' : termo.via_html_storage_path ? 'Abrir comprovante arquivado' : 'Arquivar e abrir comprovante'}
            </button>
          </div>
          <p style={styles.bannerNota}>
            Evidência permanente: texto do termo, assinatura, fotos, IP, CPF e horário ficam salvos nesta OS.
          </p>
        </div>
      ) : (
        !somenteLeitura && (
          <p style={styles.desc}>
            <strong>Fotos:</strong> registradas pela equipe, a qualquer momento.{' '}
            <strong>Assinatura:</strong> envie o link para o cliente assinar no celular dele — o IP registrado será o dele.
          </p>
        )
      )}

      {!termo && !somenteLeitura && !checklist.completo && (
        <div style={styles.checklistBox}>
          {exigirTermo && (
            <span style={styles.checkItem}>
              <Circle size={14} color="#64748b" />
              Termo assinado
            </span>
          )}
          {exigirFoto && (
            <span style={styles.checkItem}>
              {(evidencias?.fotos?.length ?? 0) > 0
                ? <CheckCircle2 size={14} color="#4ade80" />
                : <Circle size={14} color="#64748b" />}
              Fotos registradas ({evidencias?.fotos?.length ?? 0})
            </span>
          )}
        </div>
      )}

      {/*
        Posição fixa na árvore: se este bloco mudasse de lugar quando o termo é
        assinado, o React o remontaria e as fotos ainda não enviadas seriam perdidas.
      */}
      <OSFotosUpload
        lojaId={lojaId}
        osId={osId}
        momento={tipo}
        operadorId={operadorId}
        titulo={`Fotos do aparelho na ${labels.fotos}`}
        ator="registrado pela equipe da loja"
        obrigatorio={exigirFoto}
        somenteLeitura={somenteLeitura}
        fotosSalvas={evidencias?.fotos ?? []}
        apiRef={fotosApiRef}
        onSalvou={(osIdAlvo) => carregar({ silencioso: true, osIdAlvo })}
      />

      {/* Sem assinatura: ainda pode emitir via com linha em branco. Com assinatura, o CTA vive no banner. */}
      {osId && !termo && (
        <div style={styles.actionsRow}>
          <button type="button" style={styles.btnSecondary} onClick={baixarPdf} disabled={gerandoPdf}>
            <FileDown size={14} />
            {gerandoPdf ? 'Preparando...' : 'Imprimir via do cliente'}
          </button>
        </div>
      )}

      {termo ? (
        <>
          <pre style={styles.termoBox}>{termo.termo_texto}</pre>

          {evidencias.assinaturaUrl && (
            <div style={styles.block}>
              <span style={styles.label}>Assinatura</span>
              <img src={evidencias.assinaturaUrl} alt="Assinatura" style={styles.assinaturaImg} />
            </div>
          )}
        </>
      ) : somenteLeitura ? (
        <p style={styles.aviso}>{labels.titulo} não registrado para esta OS.</p>
      ) : (
        <div style={styles.block}>
          <span style={styles.label}>
            Assinatura do cliente {exigirTermo ? '*' : ''}
            <span style={styles.labelAtor}>coletada do cliente na {labels.acao}</span>
          </span>
          <div style={styles.tabs}>
            <button
              type="button"
              style={modoAssinatura === 'cliente' ? styles.tabActive : styles.tab}
              onClick={() => setModoAssinatura('cliente')}
            >
              <Smartphone size={14} /> Link no celular do cliente (recomendado)
            </button>
            <button
              type="button"
              style={modoAssinatura === 'loja' ? styles.tabActive : styles.tab}
              onClick={() => setModoAssinatura('loja')}
            >
              Assinar aqui no balcão
            </button>
          </div>

          {modoAssinatura === 'cliente' && (
            <div style={styles.linkBox}>
              <p style={styles.linkDesc}>
                Envie o link para o cliente assinar no celular dele. Isso registra IP, horário, dispositivo e, se informado, o CPF — a evidência jurídica mais forte.
              </p>
              {!osId ? (
                <p style={styles.aviso}>Salve a OS primeiro para liberar o envio do link de assinatura.</p>
              ) : (
                <>
                  {exigirFoto && (evidencias?.fotos?.length ?? 0) === 0 && (
                    <p style={styles.aviso}>
                      Adicione e salve ao menos uma foto da {labels.fotos} antes de pedir a assinatura — o termo declara que o cliente conferiu essas fotos.
                    </p>
                  )}
                  <div style={styles.linkActions}>
                    <button
                      type="button"
                      style={{
                        ...styles.btnWhatsAppDestaque,
                        opacity: telefoneWhatsApp.length >= 10 ? 1 : 0.55,
                      }}
                      onClick={enviarWhatsApp}
                      disabled={gerandoLink}
                      title={telefoneWhatsApp.length < 10 ? 'Cadastre o telefone do cliente' : 'Gera o link e abre o WhatsApp'}
                    >
                      <MessageCircle size={16} />
                      {gerandoLink ? 'Preparando link...' : 'Enviar link no WhatsApp'}
                    </button>
                    <button type="button" style={styles.btnSecondary} onClick={copiarLink} disabled={gerandoLink}>
                      <Copy size={14} /> Copiar link
                    </button>
                    <button type="button" style={styles.btnSecondary} onClick={gerarLinkCliente} disabled={gerandoLink}>
                      <Link2 size={14} /> {linkCliente ? 'Regenerar link' : 'Só gerar link / QR'}
                    </button>
                    <button type="button" style={styles.btnSecondary} onClick={() => carregar({ silencioso: true })}>
                      <RefreshCw size={14} /> Verificar assinatura
                    </button>
                  </div>
                  {telefoneWhatsApp.length < 10 && (
                    <p style={styles.avisoPequena}>
                      Cadastre o WhatsApp do cliente em Pessoas → Clientes. Sem isso, use &quot;Copiar link&quot;.
                    </p>
                  )}
                  {linkCliente && (
                    <div style={styles.linkResult}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(linkCliente)}`}
                        alt="QR Code"
                        style={styles.qr}
                      />
                      <div style={styles.linkTextWrap}>
                        <input style={styles.linkInput} readOnly value={linkCliente} />
                        <p style={styles.avisoPequena}>
                          Aguardando assinatura do cliente… verificação automática a cada 8 segundos.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {modoAssinatura === 'loja' && (
            <>
              <pre style={styles.termoBox}>{termoRenderizado}</pre>
              <label style={styles.checkRow}>
                <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
                Cliente leu e aceita o {labels.titulo.toLowerCase()}
              </label>
              <AssinaturaCanvas ref={assinaturaRef} />
              <button type="button" style={styles.btnSmall} onClick={() => assinaturaRef.current?.limpar()}>
                <Eraser size={12} /> Limpar assinatura
              </button>
              {osId && (
                <button type="button" style={styles.btnPrimary} onClick={registrarAssinaturaLoja} disabled={salvando}>
                  {salvando ? 'Registrando...' : 'Registrar assinatura no balcão'}
                </button>
              )}
              <p style={styles.avisoPequena}>
                O IP registrado será o da rede da loja. Para evidência jurídica mais forte, prefira o link no celular do cliente.
              </p>
            </>
          )}
        </div>
      )}

      {sucesso && <div style={styles.sucesso}>{sucesso}</div>}
      {erro && <div style={styles.erro}>{erro}</div>}

      {!osId && (
        <p style={styles.aviso}>
          As fotos que você adicionar agora são enviadas automaticamente ao salvar a OS.
          A assinatura do cliente fica disponível depois disso, pois o termo precisa do número da OS.
        </p>
      )}
    </div>
  );
}

const styles = {
  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  title: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', margin: '0 0 8px 0' },
  desc: { color: '#94a3b8', fontSize: '12px', margin: '0 0 16px 0', lineHeight: 1.6 },
  meta: { color: '#64748b', fontSize: '12px', margin: '0 0 12px 0' },
  bannerAssinatura: {
    position: 'relative', marginBottom: '16px', padding: '14px 16px',
    backgroundColor: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.35)',
    borderRadius: '8px',
  },
  bannerAssinaturaDestaque: {
    position: 'relative', marginBottom: '16px', padding: '14px 16px',
    backgroundColor: 'rgba(74, 222, 128, 0.14)', border: '1px solid #4ade80',
    borderRadius: '8px', boxShadow: '0 0 0 3px rgba(74, 222, 128, 0.12)',
  },
  bannerFechar: {
    position: 'absolute', top: '8px', right: '8px', background: 'transparent',
    border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex',
  },
  bannerAssinaturaTopo: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' },
  bannerTitulo: { color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0' },
  bannerSub: { color: '#94a3b8', fontSize: '12px', margin: 0, lineHeight: 1.4 },
  bannerChips: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
  chip: {
    backgroundColor: '#0f111a', border: '1px solid #2a2e3f', color: '#cbd5e1',
    fontSize: '11px', padding: '4px 8px', borderRadius: '999px',
  },
  bannerAcoes: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  btnImprimirVia: {
    backgroundColor: '#22c55e', color: '#052e16', border: 'none', padding: '10px 16px',
    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
    display: 'inline-flex', alignItems: 'center', gap: '8px',
  },
  bannerNota: { color: '#64748b', fontSize: '11px', margin: '10px 0 0 0', lineHeight: 1.4 },
  termoBox: {
    backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '14px', color: '#cbd5e1', fontSize: '12px', whiteSpace: 'pre-wrap',
    fontFamily: 'inherit', margin: '12px 0', maxHeight: '200px', overflow: 'auto',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '13px', marginBottom: '12px' },
  block: { marginBottom: '20px' },
  label: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' },
  labelAtor: { marginLeft: '8px', color: '#64748b', fontSize: '11px', fontStyle: 'italic' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
  tab: {
    backgroundColor: '#0f111a', border: '1px solid #2a2e3f', color: '#94a3b8',
    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
  },
  tabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid #38bdf8', color: '#38bdf8',
    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold',
  },
  linkBox: { backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '8px', padding: '16px' },
  linkDesc: { color: '#94a3b8', fontSize: '12px', margin: '0 0 12px 0', lineHeight: 1.5 },
  linkActions: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
  linkResult: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' },
  qr: { borderRadius: '8px', backgroundColor: '#fff', padding: '8px' },
  linkTextWrap: { flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' },
  linkInput: {
    width: '100%', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '6px',
    padding: '10px', color: '#e2e8f0', fontSize: '12px', boxSizing: 'border-box',
  },
  btnSmall: {
    marginTop: '8px', background: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8',
    padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', gap: '6px', fontSize: '12px',
  },
  btnSecondary: {
    marginTop: '10px', backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  assinaturaImg: { maxWidth: '280px', border: '1px solid #2a2e3f', borderRadius: '6px', backgroundColor: '#fff' },
  btnPrimary: {
    marginTop: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px',
    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
  },
  erro: { color: '#ef4444', fontSize: '13px', marginBottom: '12px' },
  sucesso: { color: '#4ade80', fontSize: '13px', marginBottom: '12px' },
  aviso: { color: '#fbbf24', fontSize: '13px', margin: 0 },
  avisoPequena: { color: '#64748b', fontSize: '11px', marginTop: '8px' },
  loading: { color: '#94a3b8', fontSize: '13px', padding: '12px 0' },
  checklistBox: {
    display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px',
    backgroundColor: '#0f111a', borderRadius: '6px', border: '1px solid #1f2233',
  },
  checkItem: { display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '12px' },
  actionsRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  btnWhatsApp: {
    backgroundColor: 'rgba(37, 211, 102, 0.12)', border: '1px solid #25d366', color: '#25d366',
    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  btnWhatsAppDestaque: {
    backgroundColor: '#25d366', border: 'none', color: '#062812', fontWeight: 'bold',
    padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: '8px', fontSize: '13px',
  },
  atualizandoBadge: { marginLeft: '8px', color: '#64748b', fontSize: '11px', fontWeight: 'normal' },
};
