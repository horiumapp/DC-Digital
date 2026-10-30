# Modernização DC Digital — Fase 5 (Performance)

**Branch:** `modernizacao/fase-2-3-regras-e-seguranca`  
**Data:** 2026-10-29

## Alterações

| Item | Detalhe |
|------|---------|
| Lazy tabs Admin | `Administracao.tsx` carrega cada aba sob demanda |
| Lazy tabs Frequência | `Frequencia.tsx` carrega Frequencia/Objeto/Anotações/Avaliações sob demanda |
| Remoção `motion` | Dependência sem uso no `src/`; removida do `package.json` |
| Vite chunks | Removido `vendor-motion` de `manualChunks` |

## Migration (Fases 2–3)

A migration `20261029000001_modernizacao_security_hardening.sql` **não foi aplicada** no projeto remoto nesta sessão:

- Não há projeto Supabase linkado (`.supabase` ausente)
- Credenciais no `.env` são apenas `VITE_SUPABASE_*` (anon) — insuficientes para `db push`
- Aplicar exige: `supabase link` + database password / access token, com autorização explícita

`enable_signup = false` já está em `supabase/config.toml` (config local).

## Como medir o ganho

```bash
npm run build
# Comparar dist/assets/Administracao-*.js e Frequencia-*.js
# vs chunks Tab* / FrequenciaTab* gerados sob demanda
```

## Pendências de performance

- Paginação/virtualização em TabProfessores / TabAlunos
- Compressão de imagens em `public/`
- Remover regras mortas de Google Fonts no SW
