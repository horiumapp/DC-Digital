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
        user_agent: input.userAgent || navigator.userAgent,
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
 * Envia uma nova solicitação de direitos LGPD.
 * 
 * ADVISORY: Esta função é chamável por visitantes anônimos (sem login).
 * Recomenda-se configurar rate limiting server-side via:
 * - Supabase Edge Function com throttle por IP
 * - Ou trigger PostgreSQL limitando inserts por email/hora
 */
export async function submitLgpdRequest(input: LgpdRequestInput) {
  try {
    // Validação de input
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

    const { data, error } = await supabase
      .from('lgpd_requests')
      .insert({
        nome,
        email,
        tipo,
        mensagem,
        status: 'recebida',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
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
