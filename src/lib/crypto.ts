import { db } from './db';

const KEY_LENGTH = 256;



// Safe base64 conversion to prevent stack overflows with large payloads
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}



/**
 * Obtém ou gera uma chave AES-GCM não-exportável armazenada com segurança no IndexedDB.
 */
async function getOrCreateSecureKey(userId: string): Promise<CryptoKey> {
  try {
    const record = await db.userSalts.get(userId);
    if (record && record.cryptoKey) {
      return record.cryptoKey;
    }

    // Gerar uma chave AES-GCM de 256 bits criptograficamente segura e não-exportável
    const newKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: KEY_LENGTH,
      },
      false, // extractable: false (Impede exportação/leitura da chave)
      ['encrypt', 'decrypt']
    );

    const existingSalt = record?.salt || 'dc-digital-v2'; // Mantido apenas para compatibilidade do schema
    await db.userSalts.put({ userId, salt: existingSalt, cryptoKey: newKey });
    return newKey;
  } catch (err) {
    console.error('[crypto] Erro crítico ao obter/criar chave segura no IndexedDB:', err);
    throw new Error('Não foi possível obter a chave de criptografia. O armazenamento seguro pode estar indisponível.', { cause: err });
  }
}

// ============================================================
// Criptografia / Descriptografia
// ============================================================

// FIX M2: Prefixo versionado para identificação determinística de dados criptografados.
// Elimina a heurística looksEncrypted() baseada em base64, que podia gerar falsos positivos
// para strings Base64 válidas que nunca foram criptografadas (ex: URLs, nomes em base64).
// Formato: "enc:v1:<base64(iv + ciphertext)>"
const ENCRYPTION_PREFIX = 'enc:v1:';

/**
 * Criptografa um texto usando AES-GCM.
 * Retorna "enc:v1:<base64(iv + ciphertext)>" para armazenamento.
 * O prefixo "enc:v1:" permite identificação determinística do dado criptografado.
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV para AES-GCM
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Concatenar IV + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // FIX M2: Prefixar com 'enc:v1:' para identificação inequívoca
  return ENCRYPTION_PREFIX + uint8ArrayToBase64(combined);
}

/**
 * Descriptografa um texto criptografado com encrypt().
 * Suporta tanto o formato novo ("enc:v1:<base64>") quanto o legado ("<base64>").
 * Retrocompatibilidade: dados cacheados antes do FIX M2 não têm prefixo.
 */
export async function decrypt(encryptedValue: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();

  // FIX M2: Remover prefixo versionado se presente (formato novo)
  const base64 = encryptedValue.startsWith(ENCRYPTION_PREFIX)
    ? encryptedValue.slice(ENCRYPTION_PREFIX.length)
    : encryptedValue; // Formato legado: sem prefixo

  const combined = base64ToUint8Array(base64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return decoder.decode(plaintext);
}

/**
 * FIX M2: Verifica se um valor está criptografado de forma DETERMINÍSTICA.
 *
 * Lógica em duas camadas para retrocompatibilidade:
 * 1. Formato novo: presença do prefixo "enc:v1:" — identificação inequívoca.
 * 2. Formato legado: heurística base64 — apenas para dados cacheados antes do FIX M2.
 *    Esta camada pode ser removida em uma release futura, após todos os caches
 *    locais terem sido re-criptografados no novo formato.
 *
 * Motivo do FIX: strings Base64 comuns (URLs encodadas, nomes em base64, imagens)
 * eram incorretamente identificadas como criptografadas pela heurística antiga,
 * causando falha silenciosa de descriptografia e exibição de '[DADOS PROTEGIDOS]'.
 */
export function looksEncrypted(value: string): boolean {
  if (!value) return false;

  // Formato novo: prefixo versionado explícito (sem ambiguidade)
  if (value.startsWith(ENCRYPTION_PREFIX)) return true;

  // Formato legado: heurística base64 para dados sem prefixo
  // @deprecated — Será removido na v2.0.0. Todos os caches locais devem ter sido
  // re-criptografados no formato novo (enc:v1:) até lá. Se ainda houver dados legados,
  // forçar clearAllLocalData() na migração para v2.0.0.
  // Mínimo: IV (12 bytes) + 1 byte ciphertext + 16 bytes GCM tag = 29 bytes
  // Em base64: ceil(29 * 4/3) ≈ 40 chars
  if (value.length < 40) return false;
  try {
    const decoded = atob(value);
    return decoded.length >= 29;
  } catch {
    return false;
  }
}

// ============================================================
// Helpers para objetos
// ============================================================

/**
 * Criptografa campos sensíveis de um objeto.
 * Campos não listados em sensitiveFields são mantidos em texto plano.
 */
export async function encryptFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[],
  key: CryptoKey
): Promise<T> {
  const encrypted = { ...data };

  for (const field of sensitiveFields) {
    const value = data[field];
    if (typeof value === 'string' && value.length > 0) {
      (encrypted as Record<string, unknown>)[field as string] = await encrypt(value, key);
    }
  }

  return encrypted;
}

/**
 * Resultado de decryptFields com flag de falha.
 * Se `decryptionFailed` for true, o chamador deve forçar re-cache do servidor.
 */
export interface DecryptResult<T> {
  data: T;
  decryptionFailed: boolean;
}

/**
 * Descriptografa campos sensíveis de um objeto.
 * Retorna `decryptionFailed: true` se algum campo criptografado não pôde ser descriptografado
 * (chave perdida/corrompida), sinalizando que o chamador deve buscar dados frescos do servidor.
 */
export async function decryptFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[],
  key: CryptoKey
): Promise<DecryptResult<T>> {
  const decrypted = { ...data };
  let decryptionFailed = false;

  for (const field of sensitiveFields) {
    const value = data[field];
    if (typeof value === 'string' && value.length > 0) {
      if (looksEncrypted(value)) {
        try {
          (decrypted as Record<string, unknown>)[field as string] = await decrypt(value, key);
        } catch {
          // FIX #3: Chave perdida/corrompida — sinalizar para re-cache
          (decrypted as Record<string, unknown>)[field as string] = '[DADOS PROTEGIDOS - RECONECTE PARA ATUALIZAR]';
          decryptionFailed = true;
        }
      }
      // Se não parece criptografado, manter original (texto plano legado)
    }
  }

  return { data: decrypted, decryptionFailed };
}

// ============================================================
// Cache de chave em memória (por sessão)
// ============================================================

let _cachedKey: CryptoKey | null = null;
let _cachedUserId: string | null = null;

/**
 * Obtém ou cria a chave de criptografia para o usuário atual.
 * A chave é cacheada em memória durante a sessão.
 */
export async function getOrCreateKey(userId: string): Promise<CryptoKey> {
  if (_cachedKey && _cachedUserId === userId) {
    return _cachedKey;
  }

  _cachedKey = await getOrCreateSecureKey(userId);
  _cachedUserId = userId;
  return _cachedKey;
}

/**
 * Limpa a chave cacheada (chamar no logout).
 */
export function clearKeyCache(): void {
  _cachedKey = null;
  _cachedUserId = null;
}
