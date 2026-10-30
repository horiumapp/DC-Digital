# Modernização DC Digital — Fases 2 e 3

**Branch:** `modernizacao/fase-2-3-regras-e-seguranca`  
**Data:** 2026-10-29  
**Status:** implementação no repositório; migration **não aplicada em produção** nesta etapa.

## Fase 2 — Regras Cursor

Criados em `.cursor/rules/`:

- `project-architecture.mdc`
- `security.mdc`
- `performance.mdc`
- `offline-sync.mdc`
- `database-supabase.mdc`
- `frontend-ui.mdc`
- `testing-quality.mdc`
- `data-integrity.mdc`

## Fase 3 — Segurança e integridade

| ID | Correção | Arquivo |
|----|----------|---------|
| S1 | `reject_public_signup` fail-closed | `supabase/migrations/20261029000001_modernizacao_security_hardening.sql` |
| S2 | `auth_select_turmas` sem OR `escola_id = get_user_escola_id()` | mesma migration |
| S3 | Currículo ADMIN-only (RLS + RPCs) | mesma migration |
| S4 | `user_consents` INSERT exige `user_id = auth.uid()` | mesma migration |
| S5 | Revoga UPDATE de `usuario_id`/`email` em `professores` | mesma migration |
| S6 | Reset senha professor autoriza via `professor_alocacoes` | `supabase/functions/admin-create-user/index.ts` |
| O2 | Aviso na troca de usuário com pendências | `src/contexts/AuthContext.tsx` |
| O4 | Purge de conteúdos alinhado a frequências (+ owner) | `src/services/offlineStorage.ts` |

## Aplicação da migration

Migration `20261029000001` aplicada no projeto remoto via SQL Editor (`Success. No rows returned`).

Edge Function `admin-create-user` implantada em `mvdujggtjbchufecmtap` (2026-10-29) com `--no-verify-jwt`.

Confirmar no painel Auth: `enable_signup = false`.

## Pendências seguintes (não feitas nesta entrega)

- Medição de performance / lazy tabs (Fase 5)
- Modo economia de internet (Fase 6)
- UX de conflito CONFLICT (O3)
- Background Sync / visibility wake (O1)
