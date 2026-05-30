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
 */
export async function submitLgpdRequest(input: LgpdRequestInput) {
  try {
    const { data, error } = await supabase
      .from('lgpd_requests')
      .insert({
        nome: input.nome,
        email: input.email,
        tipo: input.tipo,
        mensagem: input.mensagem,
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
