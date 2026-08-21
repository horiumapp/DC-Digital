import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * FIX S1: Caracteres usados no CAPTCHA — exclui O, I, 0, 1 para evitar
 * ambiguidade visual entre letra e número. Resultado: 31 chars possíveis.
 * Código de 6 chars = 31^6 ≈ 887 milhões de combinações
 * (vs. 4 dígitos numéricos = apenas 9.000 anteriores).
 */
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 6;

/**
 * Gera um código alfanumérico criptograficamente seguro.
 * Usa crypto.getRandomValues() — nunca Math.random().
 */
function generateCaptchaCode(): string {
  const arr = new Uint8Array(CAPTCHA_LENGTH);
  crypto.getRandomValues(arr);
  return Array.from(arr, byte => CAPTCHA_CHARS[byte % CAPTCHA_CHARS.length]).join('');
}

export function useCaptcha() {
  const [generatedCaptcha, setGeneratedCaptcha] = useState<string>(generateCaptchaCode);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const codeRef = useRef<string>('');

  useEffect(() => {
    codeRef.current = generatedCaptcha;
  }, [generatedCaptcha]);

  const generateNewCaptcha = useCallback(() => {
    const newCode = generateCaptchaCode();
    codeRef.current = newCode;
    setGeneratedCaptcha(newCode);
    setCaptchaInput('');
    setCaptchaError(false);
  }, []);

  const validateCaptcha = useCallback(() => {
    const target = codeRef.current || generatedCaptcha;
    const isValid = captchaInput.trim().toUpperCase() === target.toUpperCase();
    setCaptchaError(!isValid);
    return isValid;
  }, [captchaInput, generatedCaptcha]);

  return {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    setCaptchaError,
    generateNewCaptcha,
    validateCaptcha,
  };
}
