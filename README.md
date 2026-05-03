# DC Digital

DC Digital é uma plataforma de gestão educacional moderna, segura e responsiva, desenvolvida para simplificar o acompanhamento pedagógico. O sistema oferece ferramentas robustas para lançamento de frequências, notas e acompanhamento de conteúdos ministrados, com perfis distintos para Professores, Secretários, Gestores e Administradores.

## Funcionalidades Principais

*   **Gestão de Turmas e Lotações:** Visualização rápida de turmas alocadas ao professor, com informações detalhadas sobre escola e turno.
*   **Diário de Classe Digital:**
    *   Lançamento eficiente de frequências e conteúdos ministrados.
    *   Avaliações modulares (notas calculadas automaticamente com base no valor máximo).
    *   Métricas e estatísticas em tempo real (progresso do componente e da turma).
*   **Controle de Acesso (RBAC):** Proteção baseada em perfis de usuário (`ADMIN`, `GESTOR`, `SECRETARIO`, `PROFESSOR`) utilizando Supabase Auth e RLS (Row Level Security).
*   **Painel Administrativo:** Interface dedicada para gerenciamento de perfis, aprovação de cadastros, auditoria de pendências e visão sistêmica das escolas.
*   **Relatórios e Exportações:** Geração de relatórios detalhados de faltas, conteúdos, avaliações e pendências docentes.
*   **Interface Responsiva:** Design elegante compatível com dispositivos móveis e desktops, com suporte nativo a "Dark Mode".

## Tecnologias Utilizadas

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide Icons.
*   **Backend & Banco de Dados:** Supabase (PostgreSQL 17), Supabase Auth.
*   **Segurança:** Row Level Security (RLS) avançado, limitação de taxa (Rate Limiting no Frontend), Triggers de Auditoria em PL/pgSQL.
*   **Testes:** Vitest (Pronto para configuração de testes unitários).

## Como Instalar e Rodar Localmente

### Pré-requisitos
*   Node.js (versão 18 ou superior)
*   Conta no Supabase com projeto configurado

### Passos de Instalação

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/seu-usuario/dc-digital.git
    cd dc-digital
    ```

2.  **Instale as Dependências:**
    ```bash
    npm install
    ```

3.  **Configuração das Variáveis de Ambiente:**
    *   Copie o arquivo de exemplo para gerar o seu `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Preencha os valores de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do seu painel do Supabase.

4.  **Inicie o Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    ```
    O sistema estará disponível em `http://localhost:3000`.

## Estrutura do Banco de Dados

O banco utiliza o schema `public` do Supabase e restringe o acesso através de RLS rigoroso. Nenhuma tabela pode ser acessada de forma anônima.

*   `usuarios`: Mapeamento base dos UUIDs do Supabase Auth para funções (`cargo`).
*   `professores`: Tabela central dos docentes com status de moderação (`Ativo`/`Inativo`). Novos cadastros nascem `Inativos` para evitar fraudes.
*   `turmas` e `alunos`: Estruturas pedagógicas nucleares.
*   `professor_alocacoes`: Lotação (escola, turno e disciplina) vinculando professores a turmas específicas.
*   `frequencias`, `notas`, `avaliacoes` e `conteudos`: Tabelas de dados gerados no diário. Possuem triggers de auditoria para versionamento e prevenção de fraudes.

## Scripts Disponíveis

*   `npm run dev`: Inicia o Vite com Hot Module Replacement.
*   `npm run build`: Gera a versão otimizada de produção no diretório `/dist`.
*   `npm run preview`: Serve a pasta de build para testar a versão em produção localmente.
*   `npm run lint`: Checa a sintaxe usando ESLint e a tipagem via TypeScript (`tsc --noEmit`).
*   `npm run test`: Executa os testes unitários utilizando Vitest.

## Licença

Este projeto é de uso exclusivo para a instituição parceira. Nenhuma parte deste código pode ser distribuída ou utilizada comercialmente sem autorização.
