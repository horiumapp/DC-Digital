import { supabase } from '../lib/supabase';
import { PRIVACY_POLICY_VERSION } from '../constants/lgpdConstants';

export interface UserConsentInput {
  userId?: string;
  finalidade: string;
  status: 'aceito' | 'recusado' | 'revogado';
  ip?: string;
  userAgent?: string;
}

export interface LgpdRequestInput {
  nome: string;
  email: string;
  tipo: 'acesso' | 'correcao' | 'exclusao' | 'revogacao' | 'compartilhamento' | 'outro';
  mensagem: string;
}

export interface LgpdRequest {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  mensagem: string;
  status: 'recebida' | 'em_analise' | 'concluida' | 'recusada';
  created_at: string;
  updated_at: string;
  resposta_admin?: string;
}

/**
 * Registra o consentimento do usuário no banco de dados.
 */
export async function saveUserConsent(input: UserConsentInput) {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .insert({
        user_id: input.userId || null,
        finalidade: input.finalidade,
        status: input.status,
        versao_politica: PRIVACY_POLICY_VERSION,
        ip: input.ip || null,
        // FIX A5: Sanitizar userAgent contra XSS (remover tags HTML) e truncar como no securityLogService
        user_agent: (input.userAgent || navigator.userAgent).replace(/<[^>]*>/g, '').substring(0, 512),
        data_hora_aceite: new Date().toISOString(),
        data_hora_revogacao: input.status === 'revogado' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: unknown) {
    console.error('[LGPD Service] Erro ao salvar consentimento no banco:', error);
    return { data: null, error };
  }
}

/**
 * Rate limiting client-side para solicitações LGPD (primeira barreira).
 * Limita a 5 solicitações por 15 minutos por sessão.
 * 
 * IMPORTANTE: Isso NÃO substitui rate limiting server-side.
 * Configurar também uma das seguintes proteções:
 * - Edge Function intermediária com throttle por IP/email
 * - Trigger PostgreSQL: BEFORE INSERT ON lgpd_requests limitando por email/hora
 */
const LGPD_RATE_LIMIT_KEY = 'dc_lgpd_rate_limit';
const LGPD_RATE_LIMIT_MAX = 5;
const LGPD_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkLgpdRateLimit(): boolean {
  try {
    const stored = sessionStorage.getItem(LGPD_RATE_LIMIT_KEY);
    const entries: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    // Limpar entradas expiradas
    const recent = entries.filter(ts => (now - ts) < LGPD_RATE_LIMIT_WINDOW_MS);
    if (recent.length >= LGPD_RATE_LIMIT_MAX) {
      return false; // Limite excedido
    }
    recent.push(now);
    sessionStorage.setItem(LGPD_RATE_LIMIT_KEY, JSON.stringify(recent));
    return true;
  } catch {
    return true; // Se sessionStorage falhar, permitir (não bloquear funcionalidade)
  }
}

/**
 * Envia uma nova solicitação de direitos LGPD via Edge Function.
 * 
 * FIX #2: Rate limiting client-side (5 req/15min) como barreira de UX.
 * Proteção real: Edge Function `lgpd-request` com rate limiting por IP
 * + trigger PostgreSQL `trg_lgpd_rate_limit` por email.
 */
export async function submitLgpdRequest(input: LgpdRequestInput) {
  // Barreira de UX: rate limit client-side (evita chamadas desnecessárias)
  if (!checkLgpdRateLimit()) {
    return {
      data: null,
      error: new Error('Muitas solicitações em pouco tempo. Aguarde 15 minutos antes de enviar outra.'),
    };
  }

  try {
    // Validação client-side (duplicada no servidor, mas evita roundtrip desnecessário)
    const nome = (input.nome || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const mensagem = (input.mensagem || '').trim();
    const tipo = input.tipo;

    if (!nome || nome.length < 2 || nome.length > 200) {
      return { data: null, error: new Error('Nome inválido (2-200 caracteres).') };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return { data: null, error: new Error('E-mail inválido.') };
    }
    if (!mensagem || mensagem.length < 10 || mensagem.length > 5000) {
      return { data: null, error: new Error('Mensagem inválida (10-5000 caracteres).') };
    }
    const tiposValidos = ['acesso', 'correcao', 'exclusao', 'revogacao', 'compartilhamento', 'outro'];
    if (!tiposValidos.includes(tipo)) {
      return { data: null, error: new Error('Tipo de solicitação inválido.') };
    }

    // Chamar Edge Function com rate limiting server-side por IP
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/lgpd-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ nome, email, tipo, mensagem }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      // Rate limit server-side (429) ou erro de validação
      throw new Error(result.error || 'Erro ao processar solicitação.');
    }

    return { data: result, error: null };
  } catch (error: unknown) {
    console.error('[LGPD Service] Erro ao enviar solicitação LGPD:', error);
    return { data: null, error };
  }
}

/**
 * Lista todas as solicitações LGPD (para painel administrativo ou para o próprio titular).
 */
export async function listLgpdRequests(emailFilter?: string) {
  try {
    let query = supabase
      .from('lgpd_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (emailFilter) {
      query = query.eq('email', emailFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data as LgpdRequest[]) || [], error: null };
  } catch (error: unknown) {
    console.error('[LGPD Service] Erro ao listar solicitações LGPD:', error);
    return { data: [], error };
  }
}

/**
 * Atualiza o status e/ou resposta administrativa de uma solicitação LGPD.
 */
export async function updateLgpdRequest(
  requestId: string,
  status: 'recebida' | 'em_analise' | 'concluida' | 'recusada',
  respostaAdmin?: string
) {
  try {
    const { data, error } = await supabase
      .from('lgpd_requests')
      .update({
        status,
        resposta_admin: respostaAdmin || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: unknown) {
    console.error('[LGPD Service] Erro ao atualizar solicitação LGPD:', error);
    return { data: null, error };
  }
}
