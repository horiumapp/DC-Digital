-- =============================================================
-- DC Digital — Índices de Performance e RPCs para Alta Simultaneidade
-- Migration: 20260925000000_performance_indexes.sql
-- =============================================================
-- OBJETIVO: Acelerar as consultas mais frequentes durante picos
-- de acesso simultâneo (início de turno, chamadas, relatórios),
-- eliminando varreduras sequenciais (full table scans).
-- =============================================================

-- -------------------------------------------------------------
-- 1. ÍNDICES NA TABELA FREQUENCIAS
-- -------------------------------------------------------------
-- Acelera: fetchAllFrequencias, buscarFrequencia, relatórios e aparata
CREATE INDEX IF NOT EXISTS idx_frequencias_turma_disciplina_data
  ON public.frequencias (turma_id, disciplina, data);

CREATE INDEX IF NOT EXISTS idx_frequencias_turma_data_tempo
  ON public.frequencias (turma_id, data, tempo);

CREATE INDEX IF NOT EXISTS idx_frequencias_aluno_disciplina_data
  ON public.frequencias (aluno_id, disciplina, data);

-- -------------------------------------------------------------
-- 2. ÍNDICES NA TABELA CONTEUDOS
-- -------------------------------------------------------------
-- Acelera: fetchAllConteudos, buscarConteudo, relatórios e lançamentos
CREATE INDEX IF NOT EXISTS idx_conteudos_turma_disciplina_data
  ON public.conteudos (turma_id, disciplina, data);

CREATE INDEX IF NOT EXISTS idx_conteudos_turma_data
  ON public.conteudos (turma_id, data);

-- -------------------------------------------------------------
-- 3. ÍNDICES NA TABELA AVALIACOES E NOTAS
-- -------------------------------------------------------------
-- Acelera: fetchAvaliacoes, diário de notas e relatórios
CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma_disciplina_bimestre
  ON public.avaliacoes (turma_id, disciplina, bimestre);

CREATE INDEX IF NOT EXISTS idx_notas_avaliacao_id
  ON public.notas (avaliacao_id);

CREATE INDEX IF NOT EXISTS idx_notas_aluno_id
  ON public.notas (aluno_id);

-- -------------------------------------------------------------
-- 4. ÍNDICES NA TABELA ALUNOS
-- -------------------------------------------------------------
-- Acelera: listagem por turma, filtragem de status ativo e contagem
CREATE INDEX IF NOT EXISTS idx_alunos_turma_status
  ON public.alunos (turma_id, status);

CREATE INDEX IF NOT EXISTS idx_alunos_escola_status
  ON public.alunos (escola_id, status);

-- -------------------------------------------------------------
-- 5. ÍNDICES NA TABELA PROFESSOR_HORARIOS
-- -------------------------------------------------------------
-- Acelera: fetchHorario, pendências e validação de conflitos
CREATE INDEX IF NOT EXISTS idx_professor_horarios_turma_componente
  ON public.professor_horarios (turma_id, componente);

CREATE INDEX IF NOT EXISTS idx_professor_horarios_escola_id
  ON public.professor_horarios (escola_id);

CREATE INDEX IF NOT EXISTS idx_professor_horarios_professor_id
  ON public.professor_horarios (professor_id);

-- -------------------------------------------------------------
-- 6. ÍNDICES NA TABELA FECHAMENTOS_BIMESTRES
-- -------------------------------------------------------------
-- Acelera: verificação de diário bloqueado / aparata fechada
CREATE INDEX IF NOT EXISTS idx_fechamentos_turma_disciplina_bimestre
  ON public.fechamentos_bimestres (turma_id, disciplina, bimestre);

-- -------------------------------------------------------------
-- 7. RPC: get_lancamentos_datas_frequencias
-- -------------------------------------------------------------
-- Retorna apenas os pares únicos (data, tempo) com frequência lançada,
-- evitando o download de dezenas de milhares de registros completos.
CREATE OR REPLACE FUNCTION public.get_lancamentos_datas_frequencias(
  p_turma_id uuid,
  p_disciplina text DEFAULT NULL
)
RETURNS TABLE (data text, tempo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o usuário for anônimo, rejeita
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  RETURN QUERY
  SELECT DISTINCT f.data, f.tempo
  FROM public.frequencias f
  WHERE f.turma_id = p_turma_id
    AND (
      p_disciplina IS NULL
      OR p_disciplina = ''
      OR upper(p_disciplina) = 'TODAS'
      OR upper(p_disciplina) = 'GERAL'
      OR f.disciplina = p_disciplina
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lancamentos_datas_frequencias(uuid, text) TO authenticated;

-- -------------------------------------------------------------
-- 8. RPC: get_alunos_count_por_escola
-- -------------------------------------------------------------
-- Retorna a contagem de alunos agrupada por escola sem precisar
-- transferir toda a tabela de alunos para o cliente.
CREATE OR REPLACE FUNCTION public.get_alunos_count_por_escola()
RETURNS TABLE (escola_id uuid, total_alunos bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  RETURN QUERY
  SELECT a.escola_id, COUNT(*)::bigint AS total_alunos
  FROM public.alunos a
  WHERE a.escola_id IS NOT NULL
  GROUP BY a.escola_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_alunos_count_por_escola() TO authenticated;
