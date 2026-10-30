# Modernização DC Digital — Fase 7 (Estabilidade)

**Branch:** `modernizacao/fase-2-3-regras-e-seguranca`  
**Data:** 2026-10-29

## Entregas

| Item | Detalhe |
|------|---------|
| RouteErrorBoundary → Sentry | `reportError` com `boundary: 'route'` |
| Timeout abertura de turma | 20s em `TurmaContext` + toast amigável |
| Anti duplo-clique | `useAsyncLock` + early return em frequência/conteúdo/anotações |
| Aviso beforeunload | `useUnsavedChangesWarning` no lançamento em andamento |
| Erros admin em PT | `translateSupabaseError` em TabAlunos/Turmas/Escolas/Professores/EscolaDetalhes |

## Já existia (preservado)

- `ErrorBoundary` global + Sentry (DSN)
- Sync com timeout/abort/backoff
- Login com translateSupabaseError
- Avaliações com `isSaving` guard

## Pendências conscientes

- Aviso de saída na navegação SPA (React Router blocker) — não nesta fase
- Abort real das fetches do offline service (timeout cobre o loading preso)
- Prefetch / CONFLICT UI (fases anteriores)

## Testes

`src/__tests__/stabilityHooks.test.ts`
