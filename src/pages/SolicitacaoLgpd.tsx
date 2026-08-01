import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import Background from '../components/Background';
import { useAuth } from '../contexts/AuthContext';
import { submitLgpdRequest } from '../services/lgpdService';
import { useCaptcha } from '../hooks/useCaptcha';

export default function SolicitacaoLgpd() {
  const { user } = useAuth();
  
  // State variables for form
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState<'acesso' | 'correcao' | 'exclusao' | 'revogacao' | 'compartilhamento' | 'outro'>('acesso');
  const [mensagem, setMensagem] = useState('');
  const [declaracao, setDeclaracao] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FIX C6: CAPTCHA para proteger formulário público contra bots.
  // O formulário LGPD é acessível sem autenticação, então precisa de
  // proteção contra submissões automatizadas.
  const captcha = useCaptcha();

  // Auto-fill user details if logged in
  useEffect(() => {
    if (user) {
      setNome(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    if (!nome.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!mensagem.trim()) {
      setError('Por favor, descreva detalhadamente a sua solicitação.');
      return;
    }
    if (!declaracao) {
      setError('Você precisa marcar o termo declarando a veracidade das informações.');
      return;
    }

    // FIX C6: Validar CAPTCHA antes de enviar
    if (!captcha.validateCaptcha()) {
      setError('Código de verificação incorreto. Tente novamente.');
      captcha.generateNewCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      const { error: submitError } = await submitLgpdRequest({
        nome,
        email,
        tipo,
        mensagem,
      });

      if (submitError) throw submitError;

      setSuccess(true);
      // Reset non-user fields
      setMensagem('');
      setDeclaracao(false);
      captcha.generateNewCaptcha();
    } catch (err: unknown) {
      setError('Erro ao enviar solicitação. Por favor, tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 md:p-12 relative flex flex-col justify-between">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 dark:from-slate-900/80 dark:to-slate-900/40 pointer-events-none" />

      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-10 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 relative z-10 w-full mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to={user ? (user.role === 'ALUNO' ? '/portal-aluno' : '/turmas') : '/'}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0f2851] dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
              Solicitação LGPD
            </h1>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Utilize este formulário oficial para solicitar direitos relativos aos seus dados pessoais tratados pelo Diário Digital, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
        </p>

        {success ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Solicitação enviada com sucesso!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Registramos seu pedido no sistema. Nossa equipe administrativa analisará a solicitação e responderá diretamente no endereço de e-mail informado (<strong>{email}</strong>) dentro do prazo legal de até 15 dias.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="mt-2 text-xs font-bold text-[#0f2851] dark:text-blue-400 hover:underline cursor-pointer"
            >
              Enviar outra solicitação
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-xs font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="space-y-2">
                <label htmlFor="nome" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] dark:focus:border-blue-500 bg-slate-50/50 dark:bg-slate-800/50 transition-all placeholder-slate-400 font-medium text-sm"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] dark:focus:border-blue-500 bg-slate-50/50 dark:bg-slate-800/50 transition-all placeholder-slate-400 font-medium text-sm"
                  required
                />
              </div>
            </div>

            {/* Tipo de Solicitação */}
            <div className="space-y-2">
              <label htmlFor="tipo" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Tipo de Solicitação
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] dark:focus:border-blue-500 bg-slate-50/50 dark:bg-slate-800/50 transition-all font-medium text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="acesso">Confirmação e Acesso Simplificado aos meus dados</option>
                <option value="correcao">Correção de dados incompletos, inexatos ou desatualizados</option>
                <option value="exclusao">Exclusão/Eliminação de dados pessoais</option>
                <option value="revogacao">Revogação do consentimento</option>
                <option value="compartilhamento">Informações sobre compartilhamento com terceiros</option>
                <option value="outro">Outro pedido</option>
              </select>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <label htmlFor="mensagem" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Mensagem detalhada
              </label>
              <textarea
                id="mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Descreva detalhadamente a sua solicitação..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] dark:focus:border-blue-500 bg-slate-50/50 dark:bg-slate-800/50 transition-all placeholder-slate-400 font-medium text-sm resize-none"
                required
              />
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={declaracao}
                onChange={(e) => setDeclaracao(e.target.checked)}
                className="mt-1 rounded border-slate-300 dark:border-slate-700 text-[#0f2851] focus:ring-[#0f2851]/20 h-4 w-4 cursor-pointer"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Declaro que as informações fornecidas neste formulário são verdadeiras e exatas. Autorizo o uso dos dados informados exclusivamente para o atendimento e processamento desta solicitação de privacidade.
              </span>
            </label>

            {/* FIX C6: CAPTCHA de verificação */}
            <div className="space-y-2 border border-slate-100 dark:border-slate-700 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Código de Verificação
              </label>
              <div className="flex gap-3 items-center">
                <div 
                  onClick={captcha.generateNewCaptcha}
                  className="cursor-pointer select-none bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-lg font-mono font-bold tracking-widest text-lg border border-slate-300 dark:border-slate-600 shadow-inner hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center justify-center min-w-[80px]"
                  title="Clique para gerar outro código"
                >
                  {captcha.generatedCaptcha}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Digite os 4 números"
                  maxLength={4}
                  value={captcha.captchaInput}
                  onChange={(e) => captcha.setCaptchaInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] dark:focus:border-blue-500 transition-all placeholder-slate-400 font-medium text-sm bg-white dark:bg-slate-800/50"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Digite os 4 números exibidos acima. Clique no código cinza para recarregá-lo.
              </p>
              {captcha.captchaError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">Código incorreto. Tente novamente.</p>
              )}
            </div>

            {/* Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white text-base font-bold py-4 px-4 rounded-xl shadow-lg shadow-[#0f2851]/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                {isLoading ? (
                  'Processando...'
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Solicitação
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400 pb-4">
        © 2026 Diário Digital. Recursos de conformidade legal.
      </footer>
    </div>
  );
}
