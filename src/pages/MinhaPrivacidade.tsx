import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, User, AlertTriangle, ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import Background from '../components/Background';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logSecurityEvent } from '../services/securityLogService';
import { saveUserConsent } from '../services/lgpdService';
import { getSavedConsent, saveConsentLocal } from '../utils/lgpdConsent';
import { translateSupabaseError } from '../utils/supabaseErrors';
import DataExportButton from '../components/DataExportButton';
import ConsentToggle from '../components/ConsentToggle';

interface EscolaRelation {
  nome: string;
}

interface TurmaRelation {
  nome: string;
}

interface PersonalProfile {
  nome: string;
  email: string;
  documento?: string;
  perfil: string;
  outrosDados: Record<string, string | string[]>;
}

export default function MinhaPrivacidade() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [cookieConsent, setCookieConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const backUrl = user?.role === 'ALUNO' ? '/portal-aluno' : '/turmas';

  // Load consents and profile details
  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
      const saved = getSavedConsent();
      if (saved) {
        setCookieConsent(saved.status === 'accepted');
      }
      // Marketing defaults to false/local check if applicable
      const savedMarketing = localStorage.getItem('dc_digital_marketing_consent') === 'true';
      setMarketingConsent(savedMarketing);
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'ALUNO') {
        // Aluno - email prefix corresponds to clean CPF
        const emailParts = user.email?.split('@') || [];
        const cpfDigits = emailParts[0] || '';

        const cpfFormatado = cpfDigits.length === 11
          ? `${cpfDigits.substring(0,3)}.${cpfDigits.substring(3,6)}.${cpfDigits.substring(6,9)}-${cpfDigits.substring(9,11)}`
          : cpfDigits;

        const { data: alunos } = await supabase
          .from('alunos')
          .select('*, escolas(*), turmas(*)')
          .or(`cpf.eq.${cpfFormatado},cpf.eq.${cpfDigits}`)
          .limit(1);

        if (alunos && alunos.length > 0) {
          const a = alunos[0];
          setProfile({
            nome: a.nome,
            email: user.email,
            documento: a.cpf || '---',
            perfil: 'Aluno',
            outrosDados: {
              data_nascimento: a.data_nascimento || '---',
              sexo: a.sexo || '---',
              nome_responsavel: a.nome_responsavel || '---',
              telefone: a.telefone || '---',
              endereco: a.endereco || '---',
              matricula: a.matricula || '---',
              escola: (a.escolas as EscolaRelation | null)?.nome || '---',
              turma: (a.turmas as TurmaRelation | null)?.nome || '---',
            },
          });
        }
      } else {
        // Servidor / Professor
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('*, escolas(*)')
          .eq('id', user.id)
          .limit(1);

        // check if has matching record in professores
        const { data: professores } = await supabase
          .from('professores')
          .select('*')
          .eq('email', user.email)
          .limit(1);

        const u = usuarios && usuarios.length > 0 ? usuarios[0] : null;
        const p = professores && professores.length > 0 ? professores[0] : null;

        setProfile({
          nome: u?.nome_completo || p?.nome || user.name,
          email: user.email,
          documento: p?.cpf || '---',
          perfil: user.role,
          outrosDados: {
            escola: (u?.escolas as EscolaRelation | null)?.nome || '---',
            cargo_sistema: u?.cargo || '---',
            telefone: p?.telefone || '---',
            vinculo: p?.vinculo || '---',
            departamento: p?.departamento || '---',
            disciplinas: p?.disciplinas || [],
          },
        });
      }
    } catch (err) {
      console.error('Erro ao buscar dados do perfil de privacidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCookieConsentChange = async (checked: boolean) => {
    setCookieConsent(checked);
    const status = checked ? 'accepted' : 'declined';
    saveConsentLocal(status);
    
    await saveUserConsent({
      userId: user?.id,
      finalidade: 'Uso de cookies do sistema e termos legais',
      status: checked ? 'aceito' : 'recusado',
    });

    await logSecurityEvent({
      userId: user?.id,
      userEmail: user?.email,
      action: 'PERSONAL_DATA_CHANGE',
      entity: 'consentimento',
      metadata: { tipo_consentimento: 'cookies', aceito: checked },
    });
  };

  const handleMarketingConsentChange = async (checked: boolean) => {
    setMarketingConsent(checked);
    localStorage.setItem('dc_digital_marketing_consent', String(checked));
    
    await saveUserConsent({
      userId: user?.id,
      finalidade: 'Recebimento de notificações pedagógicas não obrigatórias',
      status: checked ? 'aceito' : 'revogado',
    });

    await logSecurityEvent({
      userId: user?.id,
      userEmail: user?.email,
      action: 'PERSONAL_DATA_CHANGE',
      entity: 'consentimento',
      metadata: { tipo_consentimento: 'marketing', aceito: checked },
    });
  };

  const prepareExportData = async () => {
    // Retorna a cópia limpa dos dados para o DataExportButton
    return {
      sistema: 'Diário Digital',
      data_exportacao: new Date().toISOString(),
      versao_politica: '1.0',
      titular: {
        id: user?.id,
        nome: profile?.nome || user?.name,
        email: profile?.email || user?.email,
        perfil: profile?.perfil || user?.role,
        documento: profile?.documento,
        detalhes: profile?.outrosDados || {},
      },
    };
  };

  const handleExportSuccess = async () => {
    // Registra log de segurança sensível sobre a exportação
    await logSecurityEvent({
      userId: user?.id,
      userEmail: user?.email,
      action: 'DATA_EXPORT',
      entity: 'usuarios',
      entityId: user?.id,
      metadata: { formato: 'JSON', origem: 'Minha Privacidade' },
    });
  };

  const validarForcaSenha = (senha: string): string | null => {
    if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (!/[A-Z]/.test(senha)) return 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/[0-9]/.test(senha)) return 'A senha deve conter pelo menos um número.';
    return null;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // FIX: Exigir senha atual antes de permitir alteração (impede alteração por session hijacking)
    if (!currentPassword) {
      setPasswordError('Informe sua senha atual para confirmar a alteração.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('As senhas não coincidem. Tente novamente.');
      return;
    }

    const forcaError = validarForcaSenha(password);
    if (forcaError) {
      setPasswordError(forcaError);
      return;
    }

    setPasswordLoading(true);
    try {
      // FIX: Reautenticar com a senha atual antes de alterar
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (reAuthError) {
        setPasswordError('Senha atual incorreta. Verifique e tente novamente.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      await logSecurityEvent({
        userId: user?.id,
        userEmail: user?.email || undefined,
        action: 'PERSONAL_DATA_CHANGE',
        entity: 'usuarios',
        entityId: user?.id,
        metadata: { descricao: 'Alteração de senha realizada pelo próprio usuário no Centro de Privacidade.' }
      });

      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setPasswordError(translateSupabaseError(errMsg));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0f2851] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 md:p-12 relative flex flex-col justify-between">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 dark:from-slate-900/80 dark:to-slate-900/40 pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full relative z-10 mb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <Link
              to={backUrl}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#0f2851] dark:text-blue-400" />
              <div>
                <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Centro de Privacidade</h1>
                <p className="text-xs text-slate-400">Gerencie seus dados pessoais e preferências LGPD</p>
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Acesso Seguro
            </span>
          </div>
        </div>

        {/* Grid de Seções */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dados Pessoais Cadastrados */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <User className="w-5 h-5 text-[#0f2851] dark:text-blue-400" />
              Dados Cadastrados no Sistema
            </h2>
            {profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{profile.nome}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 break-all">{profile.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cargo / Perfil</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{profile.perfil}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CPF / Matrícula</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{profile.documento}</p>
                </div>

                {Object.entries(profile.outrosDados).map(([key, val]) => {
                  if (typeof val === 'object' && Array.isArray(val)) {
                    if (val.length === 0) return null;
                    return (
                      <div key={key} className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {key.replace('_', ' ')}
                        </span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {val.join(', ')}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {key.replace('_', ' ')}
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{String(val)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhum dado cadastrado localizado.</p>
            )}
          </div>

          {/* Ações Rápidas de Privacidade */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <ShieldCheck className="w-5 h-5 text-[#0f2851] dark:text-blue-400" />
                Portabilidade & Direitos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Você pode solicitar uma cópia simplificada de seus dados estruturados ou requisitar alterações junto aos operadores.
              </p>
              
              <div className="flex flex-col gap-2 pt-2">
                <DataExportButton
                  getData={prepareExportData}
                  fileName={`dados_${user?.email?.split('@')[0]}_diario_digital.json`}
                  onExportSuccess={handleExportSuccess}
                />
                
                <Link
                  to="/solicitacao-lgpd"
                  state={{ tipo: 'correcao' }}
                  className="w-full flex items-center justify-center px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-center"
                >
                  Solicitar Correção de Dados
                </Link>
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 space-y-2">
              <h3 className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Exclusão de Conta
              </h3>
              <p className="text-[10px] text-red-600/80 dark:text-red-400/80 leading-relaxed">
                A exclusão definitiva da conta escolar e remoção de dados acadêmicos deve ser solicitada formalmente e depende de obrigações legais.
              </p>
              <Link
                to="/solicitacao-lgpd"
                state={{ tipo: 'exclusao' }}
                className="inline-block text-xs font-black text-red-600 dark:text-red-400 hover:underline pt-1"
              >
                Solicitar exclusão definitiva
              </Link>
            </div>
          </div>
        </div>

        {/* Alterar Senha (Segurança) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <KeyRound className="w-5 h-5 text-[#0f2851] dark:text-blue-400" />
            Alterar Senha de Acesso
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Defina uma nova senha forte para proteger sua conta e acessar o sistema.
          </p>

          {passwordError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl border border-red-100 dark:border-red-900/30">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Senha Atual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] dark:bg-slate-750 dark:text-white transition-all text-sm font-medium max-w-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nova Senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] dark:bg-slate-750 dark:text-white transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] dark:bg-slate-750 dark:text-white transition-all text-sm font-medium"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Nova Senha'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Gerenciamento de Consentimentos */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <Shield className="w-5 h-5 text-[#0f2851] dark:text-blue-400" />
            Controle de Consentimentos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Abaixo você pode visualizar e revogar consentimentos não obrigatórios concedidos anteriormente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <ConsentToggle
              label="Cookies Essenciais & Funcionalidades (Obrigatório)"
              description="Armazenamento de tokens de login e cache local do banco de dados IndexedDB (Dexie.js) para sincronização offline de notas e diários. Não pode ser desativado."
              initialChecked={true}
              onChange={() => {}}
            />
            
            <ConsentToggle
              label="Cookies não essenciais / Analíticos"
              description="Permite que o sistema colete informações sobre uso do sistema para melhorias de performance. Salva suas escolhas no localStorage."
              initialChecked={cookieConsent}
              onChange={handleCookieConsentChange}
            />

            <ConsentToggle
              label="Notificações pedagógicas opcionais"
              description="Permite o envio de alertas sobre pendências e relatórios curriculares não mandatórios. Você pode desativar a qualquer momento."
              initialChecked={marketingConsent}
              onChange={handleMarketingConsentChange}
            />
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 pb-4">
        © 2026 Diário Digital. Recursos de conformidade legal.
      </footer>
    </div>
  );
}
