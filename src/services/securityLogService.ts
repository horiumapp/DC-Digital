import { supabase } from '../lib/supabase';
import { db, now } from '../lib/db';

export interface SecurityLogInput {
  userId?: string;
  userEmail?: string;
  action: 'LOGIN' | 'LOGIN_FAILED' | 'PERSONAL_DATA_CHANGE' | 'DATA_EXPORT' | 'DATA_DELETION' | 'PERMISSION_CHANGE' | 'ADMIN_ACCESS';
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * FIX M4 (LGPD): Gera um hash SHA-256 do email para armazenamento seguro no log.
 * Em vez de guardar o email em texto plano no audit log, guardamos apenas o hash,
 * que ainda permite correlacionar eventos do mesmo usuário sem expor PII.
 * Retorna null se a API de criptografia não estiver disponível.
 */
async function hashEmail(email: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * FIX P2-#9: Salva o evento de segurança localmente no IndexedDB como fallback.
 * Usado quando o Supabase está inacessível (offline, timeout, erro RLS).
 * Os logs pendentes são sincronizados na próxima vez que o syncEngine rodar.
 */
async function saveSecurityLogLocally(input: SecurityLogInput, cleanMetadata: Record<string, unknown>): Promise<void> {
  try {
    const emailHash = input.userEmail ? await hashEmail(input.userEmail) : null;
    await db.syncLogs.add({
      timestamp: now(),
      table: 'security_logs',
      operation: 'INSERT',
      status: 'success',
      details: JSON.stringify({
        user_id: input.userId || null,
        user_email: emailHash,
        action: input.action,
        entity: input.entity || null,
        entity_id: input.entityId || null,
        user_agent: (navigator.userAgent || '').replace(/<[^>]*>/g, '').substring(0, 512),
        metadata: cleanMetadata,
      }),
    });
    console.info('[Security Log] Evento salvo localmente para sync posterior.');
  } catch (localErr) {
    console.error('[Security Log] Falha ao salvar log localmente:', localErr);
  }
}

/**
 * Registra uma ação de segurança ou privacidade no banco de dados.
 * Esta função falha silenciosamente no console para garantir que o fluxo principal
 * do usuário (ex: login) continue funcionando em caso de falha de conexão.
 *
 * FIX P2-#9: Se o Supabase estiver inacessível, salva o evento localmente
 * no IndexedDB para ser sincronizado posteriormente.
 */
export async function logSecurityEvent(input: SecurityLogInput): Promise<boolean> {
  // Sanitização de metadados: Garantir que senhas, tokens ou dados pessoais excessivos não sejam salvos no log.
  const cleanMetadata = input.metadata ? { ...input.metadata } : {};
  const sensitiveKeys = ['password', 'senha', 'token', 'access_token', 'jwt', 'secret'];
  
  for (const key of Object.keys(cleanMetadata)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      cleanMetadata[key] = '[REDUZIDO_POR_SEGURANCA]';
    }
  }

  try {
    // FIX M4 (LGPD): Usar hash do email em vez de texto plano no log de auditoria.
    // O hash SHA-256 permite correlacionar eventos do mesmo usuário sem expor PII.
    const emailHash = input.userEmail ? await hashEmail(input.userEmail) : null;

    const { error } = await supabase
      .from('security_logs')
      .insert({
        user_id: input.userId || null,
        user_email: emailHash, // Hash SHA-256, não o email em texto plano
        action: input.action,
        entity: input.entity || null,
        entity_id: input.entityId || null,
        ip: null, // O IP pode ser resolvido no backend/edge se necessário, deixamos seguro no frontend
        // FIX #11: Sanitizar User-Agent contra XSS (remover tags HTML) e truncar para evitar payloads maliciosos
        user_agent: (navigator.userAgent || '').replace(/<[^>]*>/g, '').substring(0, 512),
        created_at: new Date().toISOString(),
        metadata: cleanMetadata,
      });

    if (error) {
      console.warn('[Security Log] Falha ao gravar log no banco (RLS ou conexão):', error.message);
      // FIX P2-#9: Fallback — salvar localmente para sync posterior
      await saveSecurityLogLocally(input, cleanMetadata);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Security Log] Erro ao registrar evento de auditoria:', err);
    // FIX P2-#9: Fallback — salvar localmente para sync posterior
    await saveSecurityLogLocally(input, cleanMetadata);
    return false;
  }
}
