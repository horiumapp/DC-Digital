import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRIVACY_POLICY_VERSION } from '../constants/lgpdConstants';
import { getSavedConsent, saveConsentLocal, clearConsentLocal } from '../utils/lgpdConsent';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('LGPD Consent Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('deve retornar null se nenhum consentimento estiver salvo', () => {
    const consent = getSavedConsent();
    expect(consent).toBeNull();
  });

  it('deve salvar e ler o consentimento localmente com sucesso', () => {
    saveConsentLocal('accepted');
    const consent = getSavedConsent();
    expect(consent).not.toBeNull();
    expect(consent?.status).toBe('accepted');
    expect(consent?.version).toBe(PRIVACY_POLICY_VERSION);
  });

  it('deve salvar recusa de cookies não essenciais', () => {
    saveConsentLocal('declined');
    const consent = getSavedConsent();
    expect(consent?.status).toBe('declined');
  });

  it('deve invalidar o consentimento se a versão da política mudar', () => {
    // Salva consentimento antigo manualmente no localStorage com versão desatualizada
    const outdatedConsent = {
      status: 'accepted',
      version: '0.9',
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('dc_digital_lgpd_consent', JSON.stringify(outdatedConsent));

    const consent = getSavedConsent();
    expect(consent).toBeNull(); // Deve invalidar pois a versão atual é 1.0
  });

  it('deve limpar o consentimento local', () => {
    saveConsentLocal('accepted');
    expect(getSavedConsent()).not.toBeNull();
    clearConsentLocal();
    expect(getSavedConsent()).toBeNull();
  });
});

describe('LGPD Request Validations', () => {
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  it('deve validar e-mails corretamente', () => {
    expect(validateEmail('teste@dcdigital.org')).toBe(true);
    expect(validateEmail('aluno@escola.gov.br')).toBe(true);
    expect(validateEmail('email_invalido')).toBe(false);
    expect(validateEmail('email@semdominio')).toBe(false);
    expect(validateEmail('email.com')).toBe(false);
  });
});
