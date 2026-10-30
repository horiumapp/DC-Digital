/**
 * Valida matematicamente um CPF verificando os dígitos verificadores.
 * Aceita CPF com ou sem formatação (pontos e traço).
 */
export function validarCPF(cpf: string): boolean {
  // Remove todos os caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '');

  // Deve ter exatamente 11 dígitos
  if (numeros.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  // Valida o 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros[9])) return false;

  // Valida o 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros[10])) return false;

  return true;
}

/**
 * Formata um CPF numérico para o padrão 000.000.000-00.
 */
export function formatarCPF(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '').slice(0, 11);
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
