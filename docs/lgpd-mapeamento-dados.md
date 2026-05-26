# Mapeamento de Dados Pessoais (Data Mapping) — Diário Digital

Este documento detalha o fluxo de coleta, processamento, armazenamento, controle de acesso e retenção de dados pessoais no sistema **Diário Digital**, servindo como inventário de dados para conformidade com a Lei Geral de Proteção de Dados (LGPD).

---

## Tabela de Inventário de Dados Pessoais

| Dado Pessoal | Categoria do Titular | Local de Coleta / Interface | Finalidade do Tratamento | Base Legal Sugerida (LGPD) | Onde é Armazenado | Quem Acessa | Prazo de Retenção Sugerido | Medidas de Segurança / Obs. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nome Completo** | Aluno | `/administracao` (TabAlunos) | Identificação do aluno nas pautas e boletins. | Execução de Contrato / Obrigação Legal | Supabase (`alunos`) e Dexie (local) | Professores, Gestores, Secretários, Admin | Até a conclusão do ciclo escolar ou transferência | Criptografia em trânsito (SSL/TLS). Exibido apenas em rotas autenticadas. |
| **CPF** | Aluno | `/administracao` (TabAlunos) | Identificação única e autenticação do aluno (login no portal). | Obrigação Legal ou Regulatória | Supabase (`alunos`) e Dexie (local) | Secretários, Admin | Até a conclusão do ciclo ou transferência | CPF limpo é usado como prefixo de e-mail de acesso. Acesso restrito. |
| **Data de Nascimento** | Aluno | `/administracao` (TabAlunos) | Registro acadêmico obrigatório e validação de faixa etária. | Obrigação Legal ou Regulatória | Supabase (`alunos`) | Secretários, Admin, Professores | Perene (Histórico Escolar Oficial) | Usado para validações internas de registro de classe. |
| **Sexo** | Aluno | `/administracao` (TabAlunos) | Estatísticas e relatórios demográficos exigidos pelo Censo Escolar. | Obrigação Legal ou Regulatória | Supabase (`alunos`) | Secretários, Admin | Perene (Histórico Escolar Oficial) | Apenas fins informativos do censo. |
| **Nome do Responsável** | Aluno | `/administracao` (TabAlunos) | Identificação do responsável legal por menores para contato e assinaturas. | Execução de Contrato / Obrigação Legal | Supabase (`alunos`) | Secretários, Admin, Professores | Até o aluno completar a maioridade civil | Relevante para correspondências escolares e emergências. |
| **Telefone** | Aluno | `/administracao` (TabAlunos) | Contato direto em caso de emergência ou comunicados. | Legítimo Interesse / Execução de Contrato | Supabase (`alunos`) | Secretários, Admin, Professores | Enquanto o aluno estiver matriculado | Criptografia em repouso pelo Supabase. |
| **Endereço Residencial** | Aluno | `/administracao` (TabAlunos) | Cadastro residencial e zoneamento de transporte escolar. | Obrigação Legal (LDB) | Supabase (`alunos`) | Secretários, Admin | Enquanto o aluno estiver matriculado | Tratado com confidencialidade pela secretaria. |
| **Frequência e Presença** | Aluno | `/frequencia` | Registro obrigatório de presenças/faltas para fins de aprovação letiva. | Obrigação Legal (LDB) | Supabase (`frequencias`) e Dexie (local) | Professores, Secretários, Gestores, Admin, Aluno (própria) | Perene (Histórico Acadêmico) | Registro essencial de atividade escolar. |
| **Avaliações e Notas** | Aluno | `/diario` | Lançamento e cálculo de médias pedagógicas do bimestre. | Obrigação Legal (LDB) | Supabase (`notas`) e Dexie (local) | Professores, Secretários, Gestores, Admin, Aluno (própria) | Perene (Histórico Acadêmico) | Registro essencial de atividade acadêmica. |
| **Nome Completo** | Professor / Servidor | `/administracao` (TabProfessores) | Identificação do corpo docente nos diários de classe e relatórios. | Execução de Contrato / Obrigação Legal | Supabase (`professores` / `usuarios`) e Dexie (local) | Gestores, Secretários, Admin | Período de vigência do contrato + 5 anos | Necessário para atribuição de responsabilidade nos diários. |
| **E-mail** | Professor / Servidor | `/administracao` (TabProfessores) | Autenticação no sistema e envio de comunicações administrativas. | Execução de Contrato | Supabase (`professores` / `usuarios`) e Dexie (local) | Gestores, Secretários, Admin | Período de vínculo ativo | Chave única para login e recuperação de senha. |
| **CPF** | Professor / Servidor | `/administracao` (TabProfessores) | Registro trabalhista obrigatório e identificação fiscal. | Obrigação Legal (Trabalhista/Previdenciária) | Supabase (`professores`) | Gestores, Secretários, Admin | Prazo trabalhista regulatório (até 30 anos) | Restrito a telas de administração de funcionários. |
| **Telefone** | Professor / Servidor | `/administracao` (TabProfessores) | Contato administrativo rápido. | Execução de Contrato | Supabase (`professores`) | Gestores, Secretários, Admin | Período de vínculo ativo | Usado exclusivamente pela equipe de gestão. |
| **Vínculo Contratual** | Professor / Servidor | `/administracao` (TabProfessores) | Configurações administrativas de folha e alocação (efetivo, contratado). | Execução de Contrato / Obrigação Legal | Supabase (`professores`) | Gestores, Secretários, Admin | Prazo trabalhista regulatório | Utilizado para definir alocações e horários de trabalho. |
| **Logs de Auditoria** | Usuário Logado | Automático (Triggers DB) | Auditoria de inserção, alteração ou exclusão de dados pessoais. | Cumprimento de Obrigação Legal | Supabase (`audit_log`) | Apenas ADMIN | 5 anos sugeridos | Somente armazena IDs e e-mails de quem realizou a modificação. |
| **Logs de Segurança** | Usuário Logado / Visitante | Automático (Frontend/Auth) | Auditoria de login, erros de login, acessos restritos e exportação. | Legítimo Interesse / Obrigação Legal (MCI) | Supabase (`security_logs`) | Apenas ADMIN | 2 anos | Senhas, senhas incorretas e tokens de acesso são sanitizados/omitidos. |
| **Consentimentos LGPD** | Usuário Logado / Visitante | CookieBanner / Configurações | Registro de aceitação ou recusa de cookies não essenciais e termos. | Consentimento / Obrigação Legal | Supabase (`user_consents`) | Admin | Enquanto o consentimento for válido ou até a revogação | Guarda o IP (se aplicável), data, hora e versão dos termos aceitos. |

---

## 4. Diretrizes de Minimização de Dados (Privacidade Inerente)

1. **Evitar excessos**: Não coletamos dados de geolocalização exata em tempo real, biometria ou dados sensíveis de menores além do exigido pelos sistemas de ensino municipais/estaduais.
2. **Dados Sensíveis**: Qualquer dado referente a menores de idade (alunos) é coletado sob a base legal de cumprimento de obrigação legal (LDB e ECA), com restrição estrita de visualização.
3. **Criptografia e Descarte**:
   - Dados em repouso são gerenciados com criptografia padrão da AWS/Supabase.
   - Solicitações de exclusão de dados de alunos e diários devem passar por análise jurídica antes da eliminação física, visto que a conservação de históricos escolares é uma obrigação legal imperativa.
