import { useState } from 'react';

// FIX #19: Captcha de operação matemática em vez de número de 4 dígitos simples.
// Um número aleatório de 4 dígitos é trivialmente solucionável por bots simples.
// Operações matemáticas com operandos variáveis são significativamente mais difíceis
// para automação básica sem depender de serviços externos (ex: hCaptcha, Turnstile).

type CaptchaOperation = '+' | '-' | '×';

interface CaptchaState {
  a: number;
  b: number;
  op: CaptchaOperation;
  answer: number;
}

function generateCaptcha(): CaptchaState {
  const ops: CaptchaOperation[] = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 20) + 10; // garante resultado positivo
      b = Math.floor(Math.random() * 10) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
  }

  return { a, b, op, answer };
}

export function useCaptcha() {
  const [captchaState, setCaptchaState] = useState<CaptchaState>(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Expor a pergunta como string formatada para o componente Captcha
  const generatedCaptcha = `${captchaState.a} ${captchaState.op} ${captchaState.b} = ?`;

  const generateNewCaptcha = () => {
    setCaptchaState(generateCaptcha());
    setCaptchaInput('');
    setCaptchaError(false);
  };

  const validateCaptcha = () => {
    const inputNum = parseInt(captchaInput.trim(), 10);
    if (!isNaN(inputNum) && inputNum === captchaState.answer) {
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
