import { formatCpfCnpj, onlyDigits } from '../utils/formatters';

export function montarTermoAutorizacaoConsulta({
  nomeEmpresa = '—',
  nomeCliente = '—',
  cpfCliente = '—',
  data = null,
} = {}) {
  const dataFmt = data
    || new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const doc = cpfCliente && cpfCliente !== '—'
    ? formatCpfCnpj(onlyDigits(cpfCliente)) || cpfCliente
    : '—';

  return `AUTORIZAÇÃO DE ATENDIMENTO E TRATAMENTO DE DADOS

Eu, ${nomeCliente}, inscrito(a) sob o documento ${doc}, declaro, para os devidos fins, perante a ${nomeEmpresa}:

1. Autorizo o cadastro e o tratamento dos meus dados pessoais necessários ao atendimento, vendas, garantia, comunicação (telefone, WhatsApp e e-mail) e registro interno da loja.

2. Estou ciente de que, para segurança da operação, prevenção a fraudes e conformidade do atendimento, a loja poderá realizar consultas cadastrais e de situação de aparelhos em bases públicas e sistemas oficiais (incluindo, quando aplicável, Receita Federal e Anatel/Celular Legal), nos termos da Lei Geral de Proteção de Dados (LGPD).

3. Autorizo que os dados obtidos sejam utilizados exclusivamente para as finalidades acima, com registro interno na loja, sem comercialização a terceiros estranhos à operação.

4. Declaro que as informações fornecidas são verdadeiras e que li este instrumento antes de assinar.

Data: ${dataFmt}`;
}

export function montarMensagemAutorizacaoConsulta({
  nomeCliente,
  nomeEmpresa,
  url,
} = {}) {
  const saudacao = nomeCliente ? `Olá ${nomeCliente}!` : 'Olá!';
  return (
    `${saudacao}\n\n` +
    `Para darmos continuidade ao seu atendimento na *${nomeEmpresa || 'loja'}*, ` +
    `preciso que você assine a autorização pelo link:\n${url}\n\n` +
    `Leva menos de 1 minuto. Link válido por 48 horas.`
  );
}
