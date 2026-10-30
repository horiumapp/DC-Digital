---
trigger: always_on
---

# DC-Digital — Regras do Projeto

## 1. Objetivo

O DC-Digital é um sistema de gestão escolar/diário digital.

O projeto existente deve ser evoluído incrementalmente.

NÃO recriar o projeto do zero.
NÃO substituir a arquitetura existente sem justificativa técnica.
NÃO remover funcionalidades existentes apenas para simplificar uma implementação.

Antes de alterar código existente, compreender a arquitetura atual e identificar os impactos da mudança.

---

## 2. Stack principal

Tratar como tecnologias existentes do projeto, salvo evidência contrária no código:

- React
- TypeScript
- Supabase
- Vercel
- IndexedDB
- arquitetura offline-first
- mecanismo de sincronização de dados
- autenticação e controle de acesso
- ESLint
- React Router

Sempre verificar `package.json` e os arquivos reais antes de assumir versões ou bibliotecas específicas.

---

## 3. Regra mais importante: preservar o funcionamento existente

Antes de implementar qualquer funcionalidade:

1. localizar os arquivos relacionados;
2. entender como a funcionalidade atual funciona;
3. identificar dependências;
4. verificar impacto no banco de dados;
5. verificar impacto no modo offline;
6. verificar impacto na sincronização;
7. verificar impacto na autenticação e permissões;
8. somente então implementar.

Não fazer refatorações grandes durante uma tarefa simples.

Se uma alteração exigir mudança arquitetural relevante, explicar o motivo antes de executá-la.

---

## 4. Arquitetura offline-first

O funcionamento offline é uma característica importante do DC-Digital.

Nunca remover ou contornar o mecanismo de armazenamento local e sincronização sem uma justificativa explícita.

Ao criar ou alterar funcionalidades que gravam dados:

- definir comportamento online;
- definir comportamento offline;
- definir como os dados serão armazenados localmente;
- definir como serão sincronizados;
- tratar conflitos;
- tratar falhas de sincronização;
- evitar duplicação de registros;
- garantir que o usuário receba feedback sobre o estado da sincronização.

Toda nova funcionalidade que persista dados deve considerar o cenário:

ONLINE → operação normal

OFFLINE → operação local

ONLINE NOVAMENTE → sincronização segura

---

## 5. Supabase

Antes de criar novas tabelas, consultar a estrutura existente do Supabase.

Não criar tabelas duplicadas para representar entidades que já existem.

Antes de alterar banco de dados:

- verificar tabelas existentes;
- verificar relacionamentos;
- verificar índices;
- verificar políticas RLS;
- verificar funções/triggers;
- verificar migrations existentes.

Nunca colocar credenciais ou chaves secretas diretamente no código frontend.

Nunca expor uma chave privada do Supabase ou qualquer segredo no repositório.

---

## 6. Segurança

O sistema possui dados escolares potencialmente sensíveis.

Sempre considerar:

- autenticação;
- autorização;
- RLS;
- isolamento entre escolas/organizações;
- permissões por função;
- validação no servidor;
- proteção contra acesso indevido a dados de alunos;
- não exposição de informações desnecessárias no frontend.

Nunca confiar somente em verificações feitas no React para proteger dados.

Toda operação sensível deve ser protegida também no backend/banco.

---

## 7. Papéis de usuário

Preservar a separação de permissões existente.

Possíveis papéis incluem:

- administrador;
- direção;
- coordenação;
- professor;
- aluno;
- responsável.

Não conceder permissões adicionais automaticamente.

Ao criar uma nova funcionalidade, determinar explicitamente quais papéis podem:

- visualizar;
- criar;
- editar;
- excluir;
- aprovar.

---

## 8. Código

Preferir:

- TypeScript;
- componentes pequenos;
- funções reutilizáveis;
- hooks bem definidos;
- validação de dados;
- tratamento explícito de erros;
- nomes claros;
- código simples e legível.

Evitar:

- `any` sem necessidade;
- duplicação de código;
- componentes gigantes;
- lógica de negócio espalhada pela interface;
- código morto;
- dependências desnecessárias;
- mudanças indiscriminadas em vários arquivos.

Não alterar formatação ou arquitetura de arquivos não relacionados à tarefa.

---

## 9. Interface

O DC-Digital é um sistema utilizado diariamente por profissionais da escola.

Priorizar:

- simplicidade;
- velocidade;
- legibilidade;
- responsividade;
- acessibilidade;
- feedback claro;
- poucos cliques;
- funcionamento adequado em celular e computador.

Não modificar o design global sem necessidade.

Antes de criar novos componentes visuais, procurar componentes existentes que possam ser reutilizados.

---

## 10. Banco de dados e tipos

Quando uma alteração de banco for necessária:

1. criar migration apropriada;
2. atualizar os tipos TypeScript relacionados;
3. atualizar as consultas;
4. atualizar o mecanismo offline;
5. atualizar a sincronização;
6. testar os fluxos online e offline.

Não alterar somente o frontend esperando que o banco acompanhe automaticamente.

---

## 11. Tratamento de erros

Não esconder erros silenciosamente.

Operações importantes devem:

- capturar erros;
- registrar informações úteis para diagnóstico;
- informar o usuário quando necessário;
- permitir recuperação quando possível.

Não utilizar mensagens genéricas quando for possível fornecer uma mensagem útil.

---

## 12. Testes

Depois de implementar uma funcionalidade:

1. executar o lint;
2. executar os testes existentes;
3. verificar erros TypeScript;
4. verificar o build;
5. testar o fluxo principal;
6. testar estados de erro;
7. quando aplicável, testar offline → online;
8. verificar se funcionalidades existentes continuam funcionando.

Não considerar uma tarefa concluída apenas porque o código foi escrito.

---

## 13. Processo obrigatório para novas funcionalidades

Antes de modificar arquivos, apresentar um plano curto contendo:

### Objetivo
O que será implementado.

### Arquivos
Quais arquivos serão criados ou modificados.

### Banco
Se haverá alteração no Supabase.

### Offline
Como a funcionalidade funcionará sem internet.

### Sincronização
Como os dados serão sincronizados.

### Segurança
Quais permissões e proteções serão necessárias.

### Testes
Como a implementação será validada.

Depois da aprovação/execução:

- implementar;
- testar;
- revisar;
- informar exatamente o que foi alterado.

---

## 14. Não fazer alterações destrutivas

Não executar automaticamente:

- exclusões em massa;
- remoção de tabelas;
- remoção de migrations;
- alteração destrutiva de dados;
- remoção de módulos;
- substituição completa da arquitetura;
- troca de banco;
- troca de framework.

Se uma alteração destrutiva for realmente necessária, parar e explicar o risco antes de executar.

---

## 15. Git

Trabalhar de forma incremental.

Antes de uma alteração grande:

- verificar o estado atual do Git;
- identificar mudanças locais;
- evitar sobrescrever trabalho existente.

Não apagar alterações feitas pelo usuário.

Não fazer commits automaticamente sem solicitação explícita.

---

## 16. Regra contra "overengineering"

Resolver primeiro o problema solicitado.

Não adicionar:

- bibliotecas;
- abstrações;
- serviços;
- tabelas;
- componentes;
- padrões arquiteturais

sem necessidade real.

A solução mais simples que preserve segurança, manutenção e escalabilidade deve ser preferida.

---

## 17. Quando houver dúvida

Não inventar a arquitetura.

Pesquisar primeiro no código existente.

Prioridade de investigação:

1. `package.json`
2. `src/`
3. `supabase/`
4. serviços de autenticação
5. serviços de armazenamento local
6. mecanismo de sincronização
7. tipos
8. rotas
9. componentes compartilhados
10. documentação em `docs/`

Se ainda houver dúvida importante, explicar a dúvida antes de fazer uma alteração estrutural.

---

## 18. Regra final

O objetivo não é apenas fazer o código funcionar.

O objetivo é evoluir o DC-Digital mantendo:

- estabilidade;
- segurança;
- compatibilidade;
- funcionamento offline;
- sincronização confiável;
- boa experiência para escolas;
- código sustentável.

Toda implementação deve respeitar a arquitetura existente antes de introduzir uma nova.