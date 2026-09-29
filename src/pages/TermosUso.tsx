import { ArrowLeft, BookOpen, UserCheck, ShieldAlert, Key, Globe, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Background from '../components/Background';

export default function TermosUso() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 md:p-12 relative flex flex-col justify-between">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 dark:from-slate-900/80 dark:to-slate-900/40 pointer-events-none" />

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 relative z-10 w-full mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center"
            title="Voltar ao Login"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0f2851] dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
              Termos de Uso
            </h1>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 bg-[#eef2ff] dark:bg-blue-950/40 text-[#0f2851] dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">Termos de Utilização do Sistema</p>
              <p className="mt-1 text-xs font-medium">Estes termos estabelecem as regras de acesso e uso do Diário Digital. Atualizado em 25/05/2026.</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              1. Aceite dos Termos
            </h2>
            <p>Ao acessar e utilizar o sistema Diário Digital, você declara ter lido, compreendido e concordado em cumprir estes Termos de Uso em sua totalidade. Caso não concorde com qualquer uma das condições estabelecidas, você não deve utilizar a plataforma.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              2. Conta, Senha e Acesso
            </h2>
            <p>O acesso ao sistema é restrito a servidores escolares autorizados (administradores, gestores, secretários, professores) e alunos regularmente matriculados. Você é responsável por:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Garantir o sigilo absoluto de suas credenciais de acesso (e-mail, matrícula e senha).</li>
              <li>Não compartilhar sua conta com terceiros sob qualquer pretexto.</li>
              <li>Notificar imediatamente a administração escolar caso detecte uso não autorizado ou suspeito de suas credenciais.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              3. Regras de Uso e Proibições
            </h2>
            <p>Os usuários concordam em utilizar o Diário Digital estritamente para finalidades educacionais e pedagógicas legítimas. É terminantemente proibido:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Inserir informações falsas, incompletas ou não autorizadas relativas a alunos, notas ou frequências.</li>
              <li>Tentar contornar, violar ou comprometer as medidas de segurança ou autenticação do sistema.</li>
              <li>Utilizar a plataforma para divulgar, transmitir ou armazenar material abusivo, difamatório, ofensivo ou ilegal.</li>
              <li>Acessar ou tentar acessar dados de outros usuários que não correspondam à sua permissão ou atribuição de cargo.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              4. Responsabilidade da Plataforma e Limitações
            </h2>
            <p>O Diário Digital empenha-se em manter a estabilidade do sistema e a proteção de dados pessoais, no entanto:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>O sistema é fornecido "como está", não garantindo a total isenção de indisponibilidades temporárias decorrentes de manutenção técnica ou falhas de rede externa.</li>
              <li>Fornecemos funcionalidades de cache offline (via Dexie.js), contudo, o usuário é responsável por garantir a posterior conexão à internet para que os dados sejam sincronizados com o servidor de forma oportuna.</li>
              <li>Não nos responsabilizamos por perdas de dados resultantes de falhas de hardware do usuário, conexões de internet inseguras ou vazamento de senhas decorrentes de negligência do próprio utilizador.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              5. Suspensão de Acesso e Rescisão
            </h2>
            <p>O descumprimento de qualquer uma das regras de conduta descritas nestes Termos de Uso poderá resultar na suspensão temporária ou cancelamento definitivo da conta do usuário pela administração escolar, sem prejuízo de eventuais responsabilizações administrativas, civis ou criminais.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              6. Alterações Futuras
            </h2>
            <p>Estes Termos de Uso podem ser alterados periodicamente pela equipe de desenvolvimento para refletir modificações técnicas ou novos requisitos legais. Sempre que houver uma alteração significativa, a nova versão será informada através de avisos no sistema ou exigência de novo aceite de termos no login.</p>
          </section>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 pb-4">
        © 2026 Diário Digital. Termos legais de uso do sistema.
      </footer>
    </div>
  );
}
