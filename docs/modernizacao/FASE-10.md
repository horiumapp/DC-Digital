# Fase 10 — Proteção de saída no diário + clareza CONFLICT

**Branch:** `modernizacao/fase-10-protecao-saida`  
**Data:** 2026-10-29

## Objetivo

Fechar o gap da Fase 7: `beforeunload` não cobria navegação SPA (menu, Trocar turma, bottom nav). Melhorar a leitura de CONFLICT na fila morta sem UI de merge.

## Entregas

1. **Registry** `unsavedChangesStore` + `useUnsavedChangesWarning` registra dirty
2. **`UnsavedNavigationGuard`** com `useBlocker` + `ConfirmActionModal` (sair sem gravar / cancelar)
3. **`App`** migrou para `createBrowserRouter` / `RouterProvider` (exigência do `useBlocker`)
4. **`ConnectionStatus`**: badge Conflito vs Erro permanente; oculta “Tentar Novamente” quando só há CONFLICT

## Fora de escopo

- Prefetch de turmas
- Merge keep-local / keep-server
- Virtualização admin
- AbortSignal nas fetches offline

## Validação

- Vitest (stability hooks + guard)
- `npm run lint` / `npm run build`
