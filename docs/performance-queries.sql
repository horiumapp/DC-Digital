-- =============================================================
-- DC Digital — Consultas Seguras para Análise e Diagnóstico de Performance
-- Arquivo: docs/performance-queries.sql
-- =============================================================
-- OBJETIVO: Permitir a engenharia analisar os planos de execução reais
-- no PostgreSQL através de EXPLAIN (ANALYZE, BUFFERS), diagnosticar
-- o uso de índices e verificar a integridade temporal dos dados.
--
-- NOTA IMPORTANTE:
-- As estatísticas da view 'pg_stat_user_indexes' são zeradas após reinicializações
-- do servidor e necessitam de tempo de uso contínuo em produção para refletir
-- com fidelidade o tráfego real. Nunca remova um índice sem analisar o histórico
-- acumulado por semanas.
-- =============================================================

-- =============================================================
-- 1. CONSULTAS COM EXPLAIN (ANALYZE, BUFFERS)
-- Substitua os UUIDs de exemplo ('00000000-...') pelos IDs desejados.
-- =============================================================

-- 1.1 Frequências por Turma, Disciplina e Data
-- Verifica se o índice 'idx_frequencias_turma_disciplina_data' é utilizado via Index Scan / Bitmap Index Scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT aluno_id, status, participacao, disciplina
FROM public.frequencias
WHERE turma_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND disciplina = 'Matemática'
  AND data = '2026-03-10';

-- 1.2 Conteúdos Ministrados por Turma, Disciplina e Data
-- Verifica se o índice 'idx_conteudos_turma_disciplina_data' evita Seq Scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, turma_id, data, tempo, objetos, habilidades, descricao, disciplina
FROM public.conteudos
WHERE turma_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND disciplina = 'Matemática'
  AND data = '2026-03-10';

-- 1.3 Avaliações por Turma, Disciplina e Bimestre
-- Verifica o índice 'idx_avaliacoes_turma_disciplina_bimestre'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, nome, tipo, data, bimestre, valor_maximo
FROM public.avaliacoes
WHERE turma_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND disciplina = 'Matemática'
  AND bimestre = '1. BIMESTRE';

-- 1.4 Alunos por Turma e Status
-- Verifica o índice 'idx_alunos_turma_status'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, nome, matricula, status, numero_chamada
FROM public.alunos
WHERE turma_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND status = 'ATIVO'
ORDER BY numero_chamada;

-- 1.5 Horários de Professores por Turma e Componente
-- Verifica o índice 'idx_professor_horarios_turma_componente'
EXPLAIN (ANALYZE, BUFFERS)
SELECT dia_semana, tempo_ordem, componente, professor_id
FROM public.professor_horarios
WHERE turma_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND (componente = 'Matemática' OR componente IS NULL OR componente = '');

-- =============================================================
-- 2. IDENTIFICAR ÍNDICES POUCO USADOS OU CANDIDATOS A REMOÇÃO
-- =============================================================
-- Lista índices que consom espaço em disco e foram escaneados poucas vezes.
-- Requer que o banco esteja em produção há pelo menos 2 a 4 semanas para
-- evitar falsos positivos de índices sazonais (ex: relatórios bimestrais).
SELECT
  schemaname,
  relname AS tabela,
  indexrelname AS indice,
  idx_scan AS total_leituras_no_indice,
  idx_tup_read AS tuplas_lidas,
  idx_tup_fetch AS tuplas_recuperadas,
  pg_size_pretty(pg_relation_size(indexrelid)) AS tamanho_indice
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 50
ORDER BY pg_relation_size(indexrelid) DESC;

-- =============================================================
-- 3. MAIORES TABELAS E CONSUMO DE STORAGE
-- =============================================================
-- Diagnostica volume total de dados vs. índices por tabela.
SELECT
  relname AS tabela,
  pg_size_pretty(pg_total_relation_size(relid)) AS tamanho_total_com_indices,
  pg_size_pretty(pg_relation_size(relid)) AS tamanho_somente_dados,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS tamanho_somente_indices
FROM pg_catalog.pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- =============================================================
-- 4. AUDITORIA DE FORMATO DE DATAS (TEXT vs. YYYY-MM-DD)
-- =============================================================
-- Identifica se existem registros legados fora do padrão ISO 'YYYY-MM-DD'.
-- Se todas as contagens retornarem 0, é seguro validar as check constraints
-- adicionadas na migration via ALTER TABLE ... VALIDATE CONSTRAINT.

SELECT 'frequencias' AS tabela, COUNT(*) AS registros_fora_do_padrao
FROM public.frequencias
WHERE data !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
UNION ALL
SELECT 'conteudos' AS tabela, COUNT(*) AS registros_fora_do_padrao
FROM public.conteudos
WHERE data !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
UNION ALL
SELECT 'avaliacoes' AS tabela, COUNT(*) AS registros_fora_do_padrao
FROM public.avaliacoes
WHERE data !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
