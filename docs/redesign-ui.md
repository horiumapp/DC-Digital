# Redesign UI — Diário Digital

## Princípios

- Priorizar tarefas diárias, leitura e desempenho em dispositivos de entrada.
- Preservar regras de negócio, rotas, permissões, RLS e integrações existentes.
- Expor somente dados necessários a cada perfil, seguindo LGPD.
- Interface mobile-first, com navegação inferior no celular e sidebar no desktop.

## Navegação implementada

- Trabalho: visão geral, minhas turmas, diário de classe e frequência/notas.
- Gestão: escolas, currículo BNCC e pendências (visível apenas aos perfis autorizados).
- Consultas: relatórios e central de privacidade/LGPD.
- Celular: atalhos persistentes para Início, Diário, Frequência e Gestão/Horários.

## Tokens e componentes

| Item | Diretriz |
| --- | --- |
| Cor institucional | `#0f2851` (azul-marinho) |
| Destaque | dourado `#d4a72c`, reservado a foco visível |
| Superfície | branco/slate, bordas discretas e sombras leves |
| Controles | alvo mínimo de toque de 44 px quando aplicável |
| Acessibilidade | foco visível, rótulos, feedback textual e sem dependência de hover |
| Responsividade | 360 px, tablet, 1024 px e desktop via grids progressivos |

## Escopo entregue

1. Login, recuperação e redefinição de senha com padrão visual unificado.
2. Navegação desktop/mobile por perfil.
3. Dashboard administrativo com contagens reais e prioridades.
4. Gestão administrativa com abas responsivas e ações acessíveis em toque.
5. Diário, turma e frequência com layout adaptável, busca e presença rápida local.
6. BNCC, pendências, relatórios e central LGPD com contêineres responsivos.
7. Portal do aluno com leitura compacta em telas pequenas.

## Decisões preservadas

- Não foram criadas nem alteradas tabelas, migrations ou políticas de segurança.
- Confirmações, CAPTCHA, sincronização offline, autenticação e limites de segurança permanecem inalterados.
- As contagens administrativas usam consultas existentes e exibem indisponibilidade quando o perfil não puder consultá-las.
