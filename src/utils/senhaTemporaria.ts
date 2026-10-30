/** Senha de primeiro acesso, gerada no navegador e exibida uma única vez. */
export function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) {
    pwd += chars[arr[i] % chars.length];
  }
  return `${pwd}1A`;
}
