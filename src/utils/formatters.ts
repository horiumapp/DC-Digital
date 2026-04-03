export const formatCpfObscured = (cpf: string) => {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
};

import { APP_CONFIG } from '../config/appConfig';

export const formatMatricula = (id: string | number): string => {
  if (!id) return '';
  const idStr = id.toString();
  const numericPart = idStr.slice(-7);
  return `${APP_CONFIG.YEAR} / ${numericPart}`;
};
