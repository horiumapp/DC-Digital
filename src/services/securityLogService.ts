import { supabase } from '../lib/supabase';

export interface SecurityLogInput {
  userId?: string;
  userEmail?: string;
  action: 'LOGIN' | 'LOGIN_FAILED' | 'PERSONAL_DATA_CHANGE' | 'DATA_EXPORT' | 'DATA_DELETION' | 'PERMISSION_CHANGE' | 'ADMIN_ACCESS';
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra uma ação de segurança ou privacidade no banco de dados.
 * Esta função falha silenciosamente no console para garantir que o fluxo principal
 * do usuário (ex: login) continue funcionando em caso de falha de conexão.
 */
export async function logSecurityEvent(input: SecurityLogInput): Promise<boolean> {
  try {
    // Sanitização de metadados: Garantir que senhas, tokens ou dados pessoais excessivos não sejam salvos no log.
    const cleanMetadata = input.metadata ? { ...input.metadata } : {};
    const sensitiveKeys = ['password', 'senha', 'token', 'access_token', 'jwt', 'secret'];
    
    for (const key of Object.keys(cleanMetadata)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        cleanMetadata[key] = '[REDUZIDO_POR_SEGURANCA]';
      }
    }

    const { error } = await supabase
      .from('security_logs')
      .insert({
        user_id: input.userId || null,
        user_email: input.userEmail || null,
        action: input.action,
        entity: input.entity || null,
        entity_id: input.entityId || null,
        ip: null, // O IP pode ser resolvido no backend/edge se necessário, deixamos seguro no frontend
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
        metadata: cleanMetadata,
      });

    if (error) {
      console.warn('[Security Log] Falha ao gravar log no banco (RLS ou conexão):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Security Log] Erro ao registrar evento de auditoria:', err);
    return false;
  }
}
