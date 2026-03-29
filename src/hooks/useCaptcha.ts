import { useState } from 'react';

export function useCaptcha() {
  const [generatedCaptcha, setGeneratedCaptcha] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  const generateNewCaptcha = () => {
    setGeneratedCaptcha(Math.floor(1000 + Math.random() * 9000).toString());
    setCaptchaInput('');
    setCaptchaError(false);
  };

  const validateCaptcha = () => {
    if (captchaInput === generatedCaptcha) {
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
