import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Gera um código numérico de 4 dígitos (ex: "4829")
 * utilizando crypto.getRandomValues().
 */
function generateCaptchaCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const num = 1000 + (arr[0] % 9000);
  return num.toString();
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
