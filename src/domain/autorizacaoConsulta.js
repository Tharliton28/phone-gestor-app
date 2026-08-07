import { formatCpfCnpj, onlyDigits } from '../utils/formatters';

export const TIPO_AUTORIZACAO = {
  ATENDIMENTO: 'atendimento',
  AVALIACAO_USADO: 'avaliacao_usado',
};

function dataFmtBr(data) {
  return data
    || new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
}

function docFmt(cpfCliente) {
  if (!cpfCliente || cpfCliente === '—') return '—';
  return formatCpfCnpj(onlyDigits(cpfCliente)) || cpfCliente;
}

export function montarTermoAutorizacaoConsulta({
  nomeEmpresa = '—',
  nomeCliente = '—',
  cpfCliente = '—',
  data = null,
} = {}) {
  const dataFmt = dataFmtBr(data);
  const doc = docFmt(cpfCliente);

  return `AUTORIZAÇÃO DE ATENDIMENTO E TRATAMENTO DE DADOS

Eu, ${nomeCliente}, inscrito(a) sob o documento ${doc}, declaro, para os devidos fins, perante a ${nomeEmpresa}:

1. Autorizo o cadastro e o tratamento dos meus dados pessoais necessários ao atendimento, vendas, garantia, comunicação (telefone, WhatsApp e e-mail) e registro interno da loja.

2. Estou ciente de que, para segurança da operação, prevenção a fraudes e conformidade do atendimento, a loja poderá realizar consultas cadastrais e de situação de aparelhos em bases públicas e sistemas oficiais (incluindo, quando aplicável, Receita Federal e Anatel/Celular Legal), nos termos da Lei Geral de Proteção de Dados (LGPD).

3. Autorizo que os dados obtidos sejam utilizados exclusivamente para as finalidades acima, com registro interno na loja, sem comercialização a terceiros estranhos à operação.

4. Declaro que as informações fornecidas são verdadeiras e que li este instrumento antes de assinar.

Data: ${dataFmt}`;
}

export function montarTermoAvaliacaoUsado({
  nomeEmpresa = '—',
  nomeCliente = '—',
  cpfCliente = '—',
  imei = '—',
  modelo = '—',
  data = null,
} = {}) {
  const dataFmt = dataFmtBr(data);
  const doc = docFmt(cpfCliente);
  const imeiTxt = imei && imei !== '—' ? imei : 'a informar / registrado na avaliação';
  const modeloTxt = modelo && modelo !== '—' ? modelo : 'aparelho objeto da avaliação';

  return `TERMO DE AVALIAÇÃO / COMPRA DE APARELHO USADO

Eu, ${nomeCliente}, inscrito(a) sob o documento ${doc}, declaro perante a ${nomeEmpresa}:

1. Apresento para avaliação e eventual venda/negociação o aparelho ${modeloTxt}, IMEI ${imeiTxt}, declarando ser o legítimo possuidor/titular ou estar autorizado a negociá-lo.

2. Autorizo a ${nomeEmpresa} a tratar meus dados cadastrais e a realizar consultas necessárias à segurança da operação e prevenção a fraudes, inclusive consultas cadastrais e de situação do aparelho em bases públicas e sistemas oficiais (Receita Federal, Anatel/Celular Legal e correlatas), nos termos da LGPD.

3. Estou ciente de que a avaliação não obriga a compra pela loja e de que informações falsas ou aparelho com restrição podem impedir a negociação.

4. Autorizo o uso dos dados obtidos exclusivamente para esta avaliação/compra e registro interno, sem comercialização a terceiros estranhos à operação.

5. Declaro que as informações fornecidas são verdadeiras e que li este instrumento antes de assinar.

Data: ${dataFmt}`;
}

export function montarTermoPorTipo(tipo, vars = {}) {
  if (tipo === TIPO_AUTORIZACAO.AVALIACAO_USADO) {
    return montarTermoAvaliacaoUsado(vars);
  }
  return montarTermoAutorizacaoConsulta(vars);
}

export function montarMensagemAutorizacaoConsulta({
  nomeCliente,
  nomeEmpresa,
  url,
  tipo = TIPO_AUTORIZACAO.ATENDIMENTO,
} = {}) {
  const saudacao = nomeCliente ? `Olá ${nomeCliente}!` : 'Olá!';
  const motivo = tipo === TIPO_AUTORIZACAO.AVALIACAO_USADO
    ? `Para avaliarmos/negociarmos o aparelho na *${nomeEmpresa || 'loja'}*`
    : `Para darmos continuidade ao seu atendimento na *${nomeEmpresa || 'loja'}*`;
  return (
    `${saudacao}\n\n` +
    `${motivo}, preciso que você assine a autorização pelo link:\n${url}\n\n` +
    `Leva menos de 1 minuto. Link válido por 48 horas.`
  );
}
