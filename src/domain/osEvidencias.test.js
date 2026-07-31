import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppLink,
  calcChecklistEvidencias,
  formatarCpfDigitacao,
  montarMensagemAceite,
  montarMensagemStatusOs,
  telefoneWhatsAppCliente,
  validarCpfAceite,
} from './osEvidencias';

describe('osEvidencias', () => {
  it('aceita CPF vazio sem bloquear o termo', () => {
    const result = validarCpfAceite('');
    expect(result.valido).toBe(true);
    expect(result.cpf).toBeNull();
    expect(result.status).toBe('vazio');
  });

  it('rejeita CPF inválido', () => {
    const result = validarCpfAceite('111.111.111-11');
    expect(result.valido).toBe(false);
    expect(result.status).toBe('invalido');
  });

  it('mascara CPF na digitação', () => {
    expect(formatarCpfDigitacao('529982247')).toBe('529.982.247');
    expect(formatarCpfDigitacao('52998224725')).toBe('529.982.247-25');
  });

  it('identifica CPF que confere com o cadastro', () => {
    const result = validarCpfAceite('529.982.247-25', '52998224725');
    expect(result.valido).toBe(true);
    expect(result.status).toBe('confere');
    expect(result.confereCadastro).toBe(true);
  });

  it('identifica CPF válido divergente do cadastro', () => {
    const result = validarCpfAceite('390.533.447-05', '52998224725');
    expect(result.valido).toBe(true);
    expect(result.status).toBe('divergente');
    expect(result.confereCadastro).toBe(false);
  });

  it('monta link WhatsApp com DDI 55', () => {
    const url = buildWhatsAppLink('11999998888', 'Olá');
    expect(url).toContain('https://wa.me/5511999998888');
    expect(url).toContain('text=Ol%C3%A1');
  });

  it('monta mensagem de aceite para saída', () => {
    const msg = montarMensagemAceite({
      nomeCliente: 'João',
      codigoOs: 'OS-001',
      nomeEmpresa: 'Loja',
      url: 'https://app/aceite',
      tipo: 'saida',
    });
    expect(msg).toContain('retirada do aparelho');
    expect(msg).toContain('OS-001');
  });

  it('calcula checklist incompleto quando falta termo', () => {
    const result = calcChecklistEvidencias({
      termo: null,
      fotos: [{ id: 1 }],
      exigirTermo: true,
      exigirFoto: true,
    });
    expect(result.completo).toBe(false);
    expect(result.pendencias).toContain('Termo não assinado');
  });

  it('calcula checklist completo', () => {
    const result = calcChecklistEvidencias({
      termo: { id: 't1' },
      fotos: [{ id: 1 }],
      exigirTermo: true,
      exigirFoto: true,
    });
    expect(result.completo).toBe(true);
    expect(result.pendencias).toHaveLength(0);
  });

  it('prioriza WhatsApp dedicado no telefone do cliente', () => {
    expect(telefoneWhatsAppCliente({
      telefone: '1133334444',
      telefone_alternativo: '11999998888',
    })).toBe('11999998888');
  });

  it('monta mensagem de status da OS para WhatsApp', () => {
    const msg = montarMensagemStatusOs({
      nomeCliente: 'Ana',
      codigoOs: 'OS-0007',
      nomeEmpresa: 'Loja',
      status: 'finalizada',
      aparelhoModelo: 'iPhone 13',
    });
    expect(msg).toContain('pronto para retirada');
    expect(msg).toContain('OS-0007');
    expect(msg).toContain('iPhone 13');
  });
});
