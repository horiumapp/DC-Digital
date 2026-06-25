import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webcrypto } from 'crypto';

// Garantir que a API Web Crypto global está disponível no Node.js
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// Mock do banco de dados Dexie para evitar chamadas de E/S reais e dependência do navegador
const mockUserSalts: Record<string, any> = {};

vi.mock('../lib/db', () => {
  return {
    db: {
      userSalts: {
        get: async (userId: string) => mockUserSalts[userId] || null,
        put: async (record: { userId: string; salt: string; cryptoKey?: any }) => {
          mockUserSalts[record.userId] = record;
          return record.userId;
        }
      }
    }
  };
});

// Importar sob teste
import { getOrCreateKey, encrypt, decrypt, encryptFields, decryptFields, clearKeyCache } from '../lib/crypto';

describe('Serviço de Criptografia (crypto.ts)', () => {
  beforeEach(() => {
    // Limpar mocks e caches antes de cada teste
    clearKeyCache();
    for (const key in mockUserSalts) {
      delete mockUserSalts[key];
    }
    vi.restoreAllMocks();
  });

  it('deve obter ou criar uma chave de criptografia AES-GCM segura', async () => {
    const userId = 'user-test-uuid-123';
    const key = await getOrCreateKey(userId);

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
    // Chave deve ser marcada como não-exportável (extractable: false)
    expect(key.extractable).toBe(false);

    // Deve salvar a chave no IndexedDB simulado
    expect(mockUserSalts[userId]).toBeDefined();
    expect(mockUserSalts[userId].cryptoKey).toBe(key);
  });

  it('deve criptografar e descriptografar texto com sucesso (Roundtrip)', async () => {
    const userId = 'user-test-uuid-456';
    const key = await getOrCreateKey(userId);
    const originalText = 'Texto super secreto sobre o diário escolar';

    const encrypted = await encrypt(originalText, key);
    expect(encrypted).toBeTypeOf('string');
    expect(encrypted).not.toBe(originalText);

    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(originalText);
  });

  it('deve tratar com segurança textos grandes sem estourar o limite da pilha', async () => {
    const userId = 'user-test-uuid-stack';
    const key = await getOrCreateKey(userId);
    
    // Gerar uma string grande (~100KB)
    const largeText = 'A'.repeat(100_000);

    const encrypted = await encrypt(largeText, key);
    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(largeText);
  });

  it('deve criptografar e descriptografar campos de um objeto seletivamente', async () => {
    const userId = 'user-test-uuid-object';
    const key = await getOrCreateKey(userId);

    const userObj = {
      id: 'aluno-01',
      nome: 'João da Silva',
      cpf: '123.456.789-00',
      status: 'Ativo'
    };

    // Criptografar apenas nome e cpf
    const encryptedObj = await encryptFields(userObj, ['nome', 'cpf'], key);
    expect(encryptedObj.id).toBe(userObj.id);
    expect(encryptedObj.status).toBe(userObj.status);
    expect(encryptedObj.nome).not.toBe(userObj.nome);
    expect(encryptedObj.cpf).not.toBe(userObj.cpf);

    // Descriptografar de volta
    const decryptedResult = await decryptFields(encryptedObj, ['nome', 'cpf'], key);
    expect(decryptedResult.decryptionFailed).toBe(false);
    expect(decryptedResult.data).toEqual(userObj);
  });

  it('deve falhar ao descriptografar com chave de outro usuário', async () => {
    const user1 = 'user-1';
    const user2 = 'user-2';

    const key1 = await getOrCreateKey(user1);
    const key2 = await getOrCreateKey(user2);

    const text = 'Dados confidenciais';
    const encrypted = await encrypt(text, key1);

    // Tentar descriptografar com a chave 2 deve lançar erro
    await expect(decrypt(encrypted, key2)).rejects.toThrow();
  });
});
