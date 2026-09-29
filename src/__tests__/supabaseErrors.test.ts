import { describe, it, expect } from 'vitest';
import { translateSupabaseError } from '../utils/supabaseErrors';

describe('translateSupabaseError', () => {
  it('deve traduzir erros de senha atual ausente ou incorreta no GoTrue', () => {
    // Código GoTrue e mensagem literal retornada pelo backend
    expect(translateSupabaseError('Current password required when setting new password.')).toBe(
      'Senha atual incorreta. Verifique os dados e tente novamente.'
    );
    expect(translateSupabaseError('current_password_required')).toBe(
      'Senha atual incorreta. Verifique os dados e tente novamente.'
    );
    expect(translateSupabaseError('current_password_invalid')).toBe(
      'Senha atual incorreta. Verifique os dados e tente novamente.'
    );
    expect(translateSupabaseError('current_password_mismatch')).toBe(
      'Senha atual incorreta. Verifique os dados e tente novamente.'
    );
  });

  it('deve aceitar objetos de erro (AuthApiError / Error)', () => {
    const errorObj = {
      message: 'Current password required when setting new password.',
      code: 'current_password_required',
    };
    expect(translateSupabaseError(errorObj)).toBe(
      'Senha atual incorreta. Verifique os dados e tente novamente.'
    );

    const jsError = new Error('Current password required when setting new password.');
    expect(translateSupabaseError(jsError)).toBe(
      'Senha atual incorreta. Verifique os dados e tente novamente.'
    );
  });

  it('deve traduzir erros de senhas fracas ou detectadas pelo HaveIBeenPwned', () => {
    // Mensagem literal do Supabase Auth / HIBP
    expect(
      translateSupabaseError(
        'Password is known to be weak and easy to guess, please choose a different one.'
      )
    ).toBe(
      'Esta senha é muito fraca, fácil de adivinhar ou já foi exposta em vazamentos. Escolha uma senha mais forte e diferente.'
    );

    expect(translateSupabaseError('weak_password')).toBe(
      'Esta senha é muito fraca, fácil de adivinhar ou já foi exposta em vazamentos. Escolha uma senha mais forte e diferente.'
    );

    expect(translateSupabaseError('password has been found in a data leak (pwned)')).toBe(
      'Esta senha é muito fraca, fácil de adivinhar ou já foi exposta em vazamentos. Escolha uma senha mais forte e diferente.'
    );
  });

  it('deve traduzir erros de requisitos de complexidade de senha', () => {
    expect(
      translateSupabaseError(
        'Password should contain at least one character of each: lowercase letters, uppercase letters, digits, symbols.'
      )
    ).toBe(
      'A senha não atende aos requisitos de complexidade exigidos (letras maiúsculas, minúsculas, números e símbolos).'
    );
  });

  it('deve traduzir erros de mesma senha e divergência de confirmação', () => {
    expect(translateSupabaseError('New password should be different from the old password.')).toBe(
      'A nova senha deve ser diferente da senha atual.'
    );
    expect(translateSupabaseError('Password and confirmation must match')).toBe(
      'As senhas não coincidem. Verifique e tente novamente.'
    );
  });

  it('deve traduzir necessidade de reautenticação de sessão', () => {
    expect(translateSupabaseError('reauthentication_needed')).toBe(
      'Sua sessão precisa ser revalidada. Saia e entre novamente no sistema antes de alterar a senha.'
    );
  });

  it('deve traduzir credenciais de login inválidas', () => {
    expect(translateSupabaseError('invalid login credentials')).toBe('E-mail ou senha incorretos.');
  });

  it('deve retornar mensagem genérica segura para erros desconhecidos', () => {
    expect(translateSupabaseError('Some obscure internal backend trace 12345')).toBe(
      'Ocorreu um erro inesperado. Verifique os dados e tente novamente.'
    );
    expect(translateSupabaseError('')).toBe('Ocorreu um erro inesperado.');
    expect(translateSupabaseError(null)).toBe('Ocorreu um erro inesperado.');
    expect(translateSupabaseError(undefined)).toBe('Ocorreu um erro inesperado.');
  });
});
