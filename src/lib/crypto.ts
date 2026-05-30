import { db } from './db';

const LEGACY_SALT = 'dc-digital-offline-salt-2026';
const ITERATIONS = 100_000;
const KEY_LENGTH = 256;

// Cache do key material legado para evitar rederivar desnecessariamente
let _legacyKey: CryptoKey | null = null;
let _legacyKeyUserId: string | null = null;

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

async function getLegacyKey(userId: string): Promise<CryptoKey> {
  if (_legacyKey && _legacyKeyUserId === userId) {
    return _legacyKey;
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  _legacyKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(LEGACY_SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
  _legacyKeyUserId = userId;
  return _legacyKey;
}

async function getOrCreateUserSalt(userId: string): Promise<string> {
  try {
    const record = await db.userSalts.get(userId);
    if (record) {
      return record.salt;
    }
    // Gerar um novo salt aleatório
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const newSalt = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    await db.userSalts.put({ userId, salt: newSalt });
    return newSalt;
  } catch (err) {
    console.warn('Erro ao acessar userSalts no IndexedDB. Usando salt legado como fallback:', err);
    return LEGACY_SALT;
  }
}

/**
 * Deriva uma chave AES-GCM baseada em PBKDF2 a partir do userId (V2).
 * Mantida apenas para retrocompatibilidade em decodificações de dados legados.
 */
async function getDerivedV2Key(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const saltStr = await getOrCreateUserSalt(userId);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(saltStr),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
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

    const existingSalt = record?.salt || LEGACY_SALT;
    await db.userSalts.put({ userId, salt: existingSalt, cryptoKey: newKey });
    return newKey;
  } catch (err) {
    console.warn('Erro ao obter/criar chave segura no IndexedDB. Usando derivação como fallback:', err);
    return getDerivedV2Key(userId);
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
 * Possui fallback automático para chaves PBKDF2 antigas (V2 e V1).
 */
export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  const combined = base64ToUint8Array(encryptedBase64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return decoder.decode(plaintext);
  } catch (decryptError) {
    // Se falhar a descriptografia, tentamos as chaves anteriores se houver o ID do usuário cacheado
    if (_cachedUserId) {
      try {
        const v2Key = await getDerivedV2Key(_cachedUserId);
        const plaintext = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          v2Key,
          ciphertext
        );
        return decoder.decode(plaintext);
      } catch {
        try {
          const legacyKey = await getLegacyKey(_cachedUserId);
          const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            legacyKey,
            ciphertext
          );
          return decoder.decode(plaintext);
        } catch {
          throw decryptError; // se falhar todas, lança o erro original
        }
      }
    }
    throw decryptError;
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
  _legacyKey = null;
  _legacyKeyUserId = null;
}
