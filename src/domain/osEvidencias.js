import { formatCpfCnpj, isValidCpf, onlyDigits } from '../utils/formatters';

/** Máscara exclusiva de CPF enquanto digita (máx. 11 dígitos). */
export function formatarCpfDigitacao(valor) {
  const digits = onlyDigits(valor).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{3})(\d+)/, '$1.$2');
  if (digits.length <= 9) return digits.replace(/^(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
}

/**
 * Valida CPF no aceite público.
 * Vazio continua aceito (não bloqueia o termo), mas a UI não rotula como opcional.
 */
export function validarCpfAceite(cpf, cpfCadastro = null) {
  if (!cpf?.trim()) {
    return {
      valido: true,
      cpf: null,
      status: 'vazio',
      confereCadastro: null,
      mensagem: null,
    };
  }

  const limpo = onlyDigits(cpf);

  if (limpo.length < 11) {
    return {
      valido: false,
      cpf: null,
      status: 'incompleto',
      confereCadastro: null,
      mensagem: 'Informe os 11 dígitos do CPF.',
      erro: 'Informe os 11 dígitos do CPF.',
    };
  }

  if (!isValidCpf(limpo)) {
    return {
      valido: false,
      cpf: null,
      status: 'invalido',
      confereCadastro: null,
      mensagem: 'CPF inválido. Verifique os dígitos.',
      erro: 'CPF inválido. Verifique os dígitos.',
    };
  }

  const cadastro = onlyDigits(cpfCadastro);
  if (cadastro.length === 11) {
    const confere = cadastro === limpo;
    return {
      valido: true,
      cpf: limpo,
      status: confere ? 'confere' : 'divergente',
      confereCadastro: confere,
      mensagem: confere
        ? 'CPF confere com o cadastro da OS.'
        : 'CPF válido, mas diferente do cadastrado nesta OS. Confira se é o titular.',
      formatado: formatCpfCnpj(limpo),
    };
  }

  return {
    valido: true,
    cpf: limpo,
    status: 'valido',
    confereCadastro: null,
    mensagem: 'CPF válido.',
    formatado: formatCpfCnpj(limpo),
  };
}

export function buildWhatsAppLink(telefone, mensagem) {
  const digits = String(telefone ?? '').replace(/\D/g, '');
  const comDdi = digits.startsWith('55') ? digits : (digits ? `55${digits}` : '');
  const base = comDdi ? `https://wa.me/${comDdi}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}

export function montarMensagemAceite({ nomeCliente, codigoOs, nomeEmpresa, url, tipo = 'entrada' }) {
  const acao = tipo === 'saida' ? 'retirada do aparelho' : 'entrada do aparelho na assistência';
  const saudacao = nomeCliente ? `Olá ${nomeCliente}!` : 'Olá!';
  return `${saudacao}\n\nPor favor, assine o termo de ${acao} da OS *${codigoOs}* (${nomeEmpresa}):\n${url}\n\nLink válido por 48 horas.`;
}

const STATUS_MSG = {
  aberta: 'recebemos seu aparelho e abrimos a ordem de serviço',
  em_manutencao: 'seu aparelho está em manutenção',
  aguardando_peca: 'seu aparelho está aguardando peça',
  finalizada: 'seu aparelho está pronto para retirada',
  cancelada: 'sua ordem de serviço foi cancelada',
};

/** Aviso de status da OS pelo WhatsApp (listagem). */
export function montarMensagemStatusOs({
  nomeCliente,
  codigoOs,
  nomeEmpresa,
  status,
  aparelhoModelo,
}) {
  const saudacao = nomeCliente ? `Olá ${nomeCliente}!` : 'Olá!';
  const statusTexto = STATUS_MSG[status] ?? 'há uma atualização na sua ordem de serviço';
  const aparelho = aparelhoModelo ? ` (${aparelhoModelo})` : '';
  return `${saudacao}\n\nInformamos que ${statusTexto} — OS *${codigoOs}*${aparelho} na ${nomeEmpresa}.\n\nQualquer dúvida, responda esta mensagem.`;
}

/** Telefone preferencial para WhatsApp: campo dedicado, senão o principal. */
export function telefoneWhatsAppCliente(cliente) {
  return cliente?.telefone_alternativo || cliente?.telefone || cliente?.whatsapp || '';
}

export function calcChecklistEvidencias({ termo, fotos, exigirTermo, exigirFoto }) {
  const pendencias = [];
  if (exigirTermo && !termo) pendencias.push('Termo não assinado');
  if (exigirFoto && (!fotos || fotos.length === 0)) pendencias.push('Fotos não registradas');
  return { completo: pendencias.length === 0, pendencias };
}
