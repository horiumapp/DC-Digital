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

  return uint8ArrayToBase64(combined);
}

/**
 * Descriptografa um texto criptografado com encrypt().
 */
export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  const combined = base64ToUint8Array(encryptedBase64);
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
