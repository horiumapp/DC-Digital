import { ArrowLeft, ShieldCheck, Mail, Calendar, Info, Users, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import Background from '../components/Background';
import { PRIVACY_POLICY_VERSION } from '../constants/lgpdConstants';

export default function PoliticaPrivacidade() {
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
            <ShieldCheck className="w-6 h-6 text-[#0f2851] dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
              Política de Privacidade
            </h1>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 bg-[#eef2ff] dark:bg-blue-950/40 text-[#0f2851] dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">Recursos de apoio à conformidade com a LGPD</p>
              <p className="mt-1 text-xs font-medium">Esta política de privacidade foi elaborada em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) para o sistema Diário Digital. Versão: {PRIVACY_POLICY_VERSION} (Atualizada em 25/05/2026).</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              1. Quais dados são coletados?
            </h2>
            <p>O Diário Digital coleta e processa apenas os dados estritamente necessários para viabilizar a gestão escolar e o acompanhamento pedagógico. Os dados incluem:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Para Alunos:</strong> Nome completo, CPF, data de nascimento, sexo, matrícula, nome do responsável legal, número de contato, endereço residencial, frequências presenciais e avaliações/notas escolares.</li>
              <li><strong>Para Professores/Servidores:</strong> Nome completo, e-mail institucional/pessoal, CPF, telefone, vínculo contratual, departamento e alocações de turmas/disciplinas.</li>
              <li><strong>Para Gestores/Administradores:</strong> Nome completo, e-mail institucional e cargo administrativo.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              2. Finalidade e Base Legal do Tratamento
            </h2>
            <p>O tratamento de dados pessoais no Diário Digital fundamenta-se nas seguintes bases legais e finalidades:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Execução de Contrato ou Procedimentos Preliminares:</strong> Prestação dos serviços educacionais contratados, controle de presença diária e lançamento de notas escolares.</li>
              <li><strong>Cumprimento de Obrigação Legal ou Regulatória:</strong> Emissão de boletins escolares oficiais e manutenção de registros acadêmicos obrigatórios exigidos pela Lei de Diretrizes e Bases da Educação Nacional (LDB - Lei nº 9.394/1996).</li>
              <li><strong>Consentimento:</strong> Coleta opcional de preferências ou comunicações acessórias (quando expressamente solicitado e aceito).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              3. Compartilhamento de Dados com Terceiros
            </h2>
            <p>Não comercializamos ou compartilhamos dados pessoais para fins de publicidade. O compartilhamento ocorre apenas quando indispensável para a prestação do serviço público ou cumprimento legal:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Com a respectiva Escola vinculada e Secretaria de Educação competente para fins pedagógicos oficiais.</li>
              <li>Com autoridades governamentais por força de lei (por exemplo, auditoria do Censo Escolar).</li>
              <li>Com o provedor de infraestrutura e hospedagem (Supabase / Vercel), sob acordos rigorosos de segurança e confidencialidade.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              4. Uso de Cookies e Cache Offline
            </h2>
            <p>O Diário Digital utiliza estritamente <strong>cookies essenciais</strong> e recursos de armazenamento local (IndexedDB e localStorage) que servem para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manter a sessão do usuário ativa e segura (tokens JWT de autenticação).</li>
              <li>Armazenar temporariamente dados offline (Dexie.js) para sincronização posterior em áreas sem acesso à internet.</li>
              <li>Salvar as preferências de conformidade de privacidade definidas pelo próprio usuário no banner inicial.</li>
            </ul>
            <p>Por serem de natureza essencial para o funcionamento do sistema de diários escolares e portal do aluno, estes cookies não podem ser desativados sem comprometer a usabilidade do aplicativo.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              5. Direitos do Titular de Dados
            </h2>
            <p>Em conformidade com o Artigo 18 da LGPD, os usuários e seus responsáveis legais podem exercer os seguintes direitos a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar a existência de tratamento e obter acesso facilitado aos seus dados.</li>
              <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a portabilidade ou obter uma cópia de seus dados em formato estruturado (JSON).</li>
              <li>Requerer a eliminação de dados pessoais que não sejam obrigatórios por lei.</li>
              <li>Revogar consentimentos anteriormente concedidos.</li>
            </ul>
            <p>Para exercer esses direitos, utilize nosso <Link to="/solicitacao-lgpd" className="text-[#0f2851] dark:text-blue-400 font-bold hover:underline">Formulário de Solicitação LGPD</Link> disponível publicamente no rodapé.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              6. Retenção de Dados
            </h2>
            <p>Os dados acadêmicos e cadastrais são mantidos no sistema durante todo o período letivo ativo ou pelo prazo regulatório necessário para a emissão de históricos e documentos oficiais, conforme normas do Ministério da Educação e órgãos estaduais/municipais de ensino.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#0f2851] dark:text-blue-400" />
              7. Contato do Encarregado (DPO)
            </h2>
            <p>Se você tiver alguma dúvida sobre esta política de privacidade ou sobre as atividades de tratamento de dados do Diário Digital, entre em contato com nosso Encarregado pelo e-mail: <a href="mailto:dpo@dcdigital.org" className="text-[#0f2851] dark:text-blue-400 font-bold hover:underline">dpo@dcdigital.org</a>.</p>
          </section>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 pb-4">
        © 2026 Diário Digital. Recursos de conformidade legal.
      </footer>
    </div>
  );
}
