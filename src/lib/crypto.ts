/**
 * crypto.ts — Criptografia de dados sensíveis no IndexedDB
 * 
 * Usa a Web Crypto API (SubtleCrypto) nativa do browser.
 * Criptografa dados de alunos (CPF, nomes) armazenados localmente.
 * Chave derivada do userId via PBKDF2.
 */

const SALT = 'dc-digital-offline-salt-2026';
const ITERATIONS = 100_000;
const KEY_LENGTH = 256;

// ============================================================
// Derivação de chave
// ============================================================

/**
 * Deriva uma chave AES-GCM a partir do userId do usuário.
 * A mesma chave é gerada consistentemente para o mesmo userId.
 */
export async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============================================================
// Criptografia / Descriptografia
// ============================================================

/**
 * Criptografa um texto usando AES-GCM.
 * Retorna base64(iv + ciphertext) para armazenamento.
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

  return btoa(String.fromCharCode(...combined));
}

/**
 * Descriptografa um texto criptografado com encrypt().
 */
export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
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
 * Descriptografa campos sensíveis de um objeto.
 */
export async function decryptFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[],
  key: CryptoKey
): Promise<T> {
  const decrypted = { ...data };

  for (const field of sensitiveFields) {
    const value = data[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        (decrypted as Record<string, unknown>)[field as string] = await decrypt(value, key);
      } catch {
        // Se falhar a descriptografia (dado não estava criptografado), manter original
        (decrypted as Record<string, unknown>)[field as string] = value;
      }
    }
  }

  return decrypted;
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

  _cachedKey = await deriveKey(userId);
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
