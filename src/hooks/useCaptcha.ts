import { useState } from 'react';

/**
 * Gera um código numérico de 4 dígitos (1000-9999).
 * Usa crypto.getRandomValues() — criptograficamente seguro,
 * ao contrário de Math.random() que é previsível.
 */
function generate4DigitCode(): string {
  const arr = new Uint16Array(1);
  crypto.getRandomValues(arr);
  return (1000 + (arr[0] % 9000)).toString();
}

export function useCaptcha() {
  const [generatedCaptcha, setGeneratedCaptcha] = useState<string>(generate4DigitCode);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  const generateNewCaptcha = () => {
    setGeneratedCaptcha(generate4DigitCode());
    setCaptchaInput('');
    setCaptchaError(false);
  };

  const validateCaptcha = () => {
    if (captchaInput.trim() === generatedCaptcha) {
      setCaptchaError(false);
      return true;
    }
    setCaptchaError(true);
    return false;
  };

  return { 
    generatedCaptcha, 
    captchaInput, 
    setCaptchaInput, 
    captchaError, 
    setCaptchaError, 
    generateNewCaptcha, 
    validateCaptcha 
  };
}

