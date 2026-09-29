import { PRIVACY_POLICY_VERSION } from '../constants/lgpdConstants';

export interface ConsentInfo {
  status: 'accepted' | 'declined';
  version: string;
  timestamp: string;
}

const CONSENT_KEY = 'dc_digital_lgpd_consent';

export function getSavedConsent(): ConsentInfo | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const consent: ConsentInfo = JSON.parse(raw);
    if (consent.version !== PRIVACY_POLICY_VERSION) {
      return null; // A versão mudou, requer novo consentimento
    }
    return consent;
  } catch (e) {
    console.error('Erro ao ler consentimento:', e);
    return null;
  }
}

export function saveConsentLocal(status: 'accepted' | 'declined'): ConsentInfo {
  const consent: ConsentInfo = {
    status,
    version: PRIVACY_POLICY_VERSION,
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch (e) {
    console.error('Erro ao salvar consentimento:', e);
  }
  return consent;
}

export function clearConsentLocal(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch (e) {
    console.error('Erro ao limpar consentimento:', e);
  }
}
