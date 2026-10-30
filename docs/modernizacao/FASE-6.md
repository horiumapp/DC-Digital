# Modernização DC Digital — Fase 6 (Internet fraca / offline)

**Branch:** `modernizacao/fase-2-3-regras-e-seguranca`  
**Data:** 2026-10-29

## Objetivos entregues

| Item | Implementação |
|------|----------------|
| Preferência Economia de Internet | `src/utils/dataSaver.ts` + toggle em Privacidade |
| Detecção Save-Data / 2G | `getConnectionProfile()` |
| Ping adaptativo | `useOnlineStatus` usa `getPingIntervals()` |
| Lotes de sync menores | `syncEngine` usa `getSyncBatchSize()` (200 → 80/40) |
| Wake sem Background Sync | `visibilitychange` + `pageshow` em `OfflineContext` |
| UI leve | classe `html.dc-data-saver` em `index.css` |

## Onde o usuário ativa

**Privacidade & LGPD** → seção **Conexão e Dados** → *Economia de Internet*.

## Comportamento

- Preferência ON: lote 40, ping 120s/30s, menos animações.
- Rede constrained (Save-Data/2G) mesmo com preferência OFF: lote 80, ping espaçado, classe CSS.
- Sync continua em foreground; ao reabrir a aba com pendências, agenda sync.

## Não feito nesta fase (pendências)

- Prefetch proativo de turmas (custa dados — deixar para ajuste fino)
- UI completa de conflito CONFLICT (O3)
- Background Sync nativo (Chrome-only; wake cobriu o essencial)

## Testes

`src/__tests__/dataSaver.test.ts`
