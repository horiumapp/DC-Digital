-- =============================================================
-- DC Digital — Correção de Segurança em RPCs e Limpeza de Índices
-- Migration: 20260925000001_fix_rpc_security_and_indexes.sql
-- =============================================================
-- PRIORIDADE 1: Corrigir SECURITY DEFINER -> SECURITY INVOKER
-- PRIORIDADE 2: Remover índices redundantes
-- PRIORIDADE 5: Criar RPC server-side get_pendencias_docentes
-- PRIORIDADE 6: Criar RPC transacional replace_professor_horarios
-- PRIORIDADE 7: Adicionar CHECK CONSTRAINT (NOT VALID) para formato de data
-- =============================================================

-- =============================================================
-- 1. REMOÇÃO DE ÍNDICES REDUNDANTES (PRIORIDADE 2)
-- =============================================================

-- 1.1 fechamentos_bimestres:
-- Já possui constraint unique_fechamento_turma_disciplina_bimestre
-- UNIQUE (turma_id, disciplina, bimestre), que gera automaticamente
-- um índice único idêntico em (turma_id, disciplina, bimestre).
-- O índice idx_fechamentos_turma_disciplina_bimestre é 100% redundante.
DROP INDEX IF EXISTS public.idx_fechamentos_turma_disciplina_bimestre;

-- 1.2 notas:
-- Já possui constraint notas_avaliacao_id_aluno_id_key
-- UNIQUE (avaliacao_id, aluno_id). Em índices B-tree, consultas com
-- WHERE avaliacao_id = ? ou JOINs em avaliacao_id utilizam a primeira
-- coluna do índice composto. O índice idx_notas_avaliacao_id é redundante.
-- (Mantemos idx_notas_aluno_id, pois aluno_id é a segunda coluna).
DROP INDEX IF EXISTS public.idx_notas_avaliacao_id;

-- 1.3 professor_horarios:
-- Já possui constraint professor_horarios_professor_id_dia_semana_tempo_ordem_key
-- UNIQUE (professor_id, dia_semana, tempo_ordem). A primeira coluna é
-- professor_id, atendendo plenamente filtros por professor_id.
-- O índice idx_professor_horarios_professor_id é redundante.
DROP INDEX IF EXISTS public.idx_professor_horarios_professor_id;

-- =============================================================
-- 2. CORREÇÃO DE SEGURANÇA DAS RPCs EXISTENTES (PRIORIDADE 1)
-- =============================================================

-- 2.1 get_lancamentos_datas_frequencias
-- Alterado para SECURITY INVOKER para que as políticas RLS de frequencias
-- sejam respeitadas. Adiciona validação de permissão via p_acesso_por_turma.
CREATE OR REPLACE FUNCTION public.get_lancamentos_datas_frequencias(
  p_turma_id uuid,
  p_disciplina text DEFAULT NULL
)
RETURNS TABLE (data text, tempo text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  IF NOT public.p_acesso_por_turma(p_turma_id) THEN
    RAISE EXCEPTION 'Acesso negado para a turma informada';
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

REVOKE ALL ON FUNCTION public.get_lancamentos_datas_frequencias(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lancamentos_datas_frequencias(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lancamentos_datas_frequencias(uuid, text) TO authenticated;

-- 2.2 get_alunos_count_por_escola
-- Alterado para SECURITY INVOKER. O RLS de alunos (p_escola_permitida)
-- garante que secretários vejam apenas sua escola, e gestores/admins vejam
-- conforme sua abrangência. Perfis sem acesso administrativo são bloqueados.
CREATE OR REPLACE FUNCTION public.get_alunos_count_por_escola()
RETURNS TABLE (escola_id uuid, total_alunos bigint)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  IF (SELECT public.get_user_role()) NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Acesso negado: perfil sem permissão para consultar contagem de alunos';
  END IF;

  RETURN QUERY
  SELECT a.escola_id, COUNT(*)::bigint AS total_alunos
  FROM public.alunos a
  WHERE a.escola_id IS NOT NULL
  GROUP BY a.escola_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_alunos_count_por_escola() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_alunos_count_por_escola() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_alunos_count_por_escola() TO authenticated;

-- 2.3 get_frequencias_distinct_lote
-- Alterado para SECURITY INVOKER. O RLS da tabela frequencias é aplicado
-- naturalmente para cada registro, prevenindo vazamento entre escolas/turmas.
CREATE OR REPLACE FUNCTION public.get_frequencias_distinct_lote(
  p_turma_ids uuid[],
  p_disciplinas text[],
  p_start text DEFAULT NULL,
  p_end text DEFAULT NULL
)
RETURNS TABLE (turma_id uuid, disciplina text, tempo text, data text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  RETURN QUERY
  SELECT DISTINCT f.turma_id, f.disciplina, f.tempo, f.data
  FROM public.frequencias f
  WHERE f.turma_id = ANY(p_turma_ids)
    AND f.disciplina = ANY(p_disciplinas)
    AND (p_start IS NULL OR f.data >= p_start)
    AND (p_end IS NULL OR f.data <= p_end);
END;
$$;

REVOKE ALL ON FUNCTION public.get_frequencias_distinct_lote(uuid[], text[], text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_frequencias_distinct_lote(uuid[], text[], text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_frequencias_distinct_lote(uuid[], text[], text, text) TO authenticated;

-- =============================================================
-- 3. RPC TRANSACIONAL DE HORÁRIOS (PRIORIDADE 6)
-- =============================================================

CREATE OR REPLACE FUNCTION public.replace_professor_horarios(
  p_professor_id uuid,
  p_escola_id uuid,
  p_horarios jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_turma_id uuid;
  v_dia_semana int;
  v_tempo_ordem int;
  v_componente text;
BEGIN
  -- 1. Validar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  -- 2. Validar perfil e permissão para a escola
  IF NOT public.p_escola_permitida(p_escola_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário sem permissão para esta escola';
  END IF;

  -- 3. Validar se o professor existe
  IF NOT EXISTS (SELECT 1 FROM public.professores WHERE id = p_professor_id) THEN
    RAISE EXCEPTION 'Professor não encontrado: %', p_professor_id;
  END IF;

  -- 4. Validar se a escola existe
  IF NOT EXISTS (SELECT 1 FROM public.escolas WHERE id = p_escola_id) THEN
    RAISE EXCEPTION 'Escola não encontrada: %', p_escola_id;
  END IF;

  -- 5. Excluir horários antigos do professor nesta escola (dentro da mesma transação)
  DELETE FROM public.professor_horarios
  WHERE professor_id = p_professor_id
    AND escola_id = p_escola_id;

  -- 6. Inserir novos horários
  IF p_horarios IS NOT NULL AND jsonb_array_length(p_horarios) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_horarios)
    LOOP
      v_turma_id := (v_item->>'turma_id')::uuid;
      v_dia_semana := (v_item->>'dia_semana')::int;
      v_tempo_ordem := (v_item->>'tempo_ordem')::int;
      v_componente := COALESCE(TRIM(v_item->>'componente'), '');

      IF v_turma_id IS NULL OR v_dia_semana IS NULL OR v_tempo_ordem IS NULL THEN
        RAISE EXCEPTION 'Dados inválidos no item de horário: turma_id, dia_semana e tempo_ordem são obrigatórios';
      END IF;

      INSERT INTO public.professor_horarios (
        professor_id,
        turma_id,
        escola_id,
        dia_semana,
        tempo_ordem,
        componente
      ) VALUES (
        p_professor_id,
        v_turma_id,
        p_escola_id,
        v_dia_semana,
        v_tempo_ordem,
        v_componente
      );
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_professor_horarios(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_professor_horarios(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_professor_horarios(uuid, uuid, jsonb) TO authenticated;

-- =============================================================
-- 4. RPC DE PENDÊNCIAS SERVER-SIDE (PRIORIDADE 5)
-- =============================================================

-- Função auxiliar interna para cálculo de dias da semana em intervalo
CREATE OR REPLACE FUNCTION public.count_weekdays_in_range(
  p_start date,
  p_end date,
  p_dow integer
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_start > p_end THEN 0
    ELSE
      ((p_end - p_start + 1) / 7) +
      (CASE WHEN ((p_dow - EXTRACT(DOW FROM p_start)::integer + 7) % 7) < ((p_end - p_start + 1) % 7) THEN 1 ELSE 0 END)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_pendencias_docentes(
  p_escola_id uuid DEFAULT NULL,
  p_periodos jsonb DEFAULT '[]'::jsonb,
  p_professor_email text DEFAULT NULL
)
RETURNS TABLE (
  professor text,
  turma_id uuid,
  turma text,
  componente text,
  periodo text,
  turno text,
  ensino text,
  fase text,
  total_aulas_esperadas integer,
  frequencias_lancadas integer,
  conteudos_lancados integer,
  pend_notas numeric,
  pend_freq numeric,
  pend_objeto numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;

  IF p_escola_id IS NOT NULL AND NOT public.p_escola_permitida(p_escola_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário sem permissão para esta escola';
  END IF;

  RETURN QUERY
  WITH periodos_parsed AS (
    SELECT
      (elem->>'id')::text AS periodo_id,
      (elem->>'data_inicio')::date AS p_start,
      LEAST(CURRENT_DATE, (elem->>'data_fim')::date) AS p_effective_end,
      (elem->>'data_fim')::date AS p_end
    FROM jsonb_array_elements(p_periodos) elem
  ),
  slots_distintos AS (
    SELECT DISTINCT
      ph.professor_id,
      p.nome AS professor_nome,
      p.email AS professor_email,
      ph.turma_id,
      t.nome AS turma_nome_completo,
      t.turno AS turma_turno,
      t.ensino AS turma_ensino,
      ph.componente,
      ph.dia_semana,
      ph.tempo_ordem,
      per.periodo_id,
      per.p_start,
      per.p_effective_end
    FROM public.professor_horarios ph
    JOIN public.professores p ON ph.professor_id = p.id
    JOIN public.turmas t ON ph.turma_id = t.id
    CROSS JOIN periodos_parsed per
    WHERE (p_escola_id IS NULL OR ph.escola_id = p_escola_id)
      AND (
        p_professor_email IS NULL
        OR lower(trim(p.email)) = lower(trim(p_professor_email))
      )
  ),
  grupos_agregados AS (
    SELECT
      s.professor_id,
      s.professor_nome,
      s.turma_id,
      s.turma_nome_completo,
      s.turma_turno,
      s.turma_ensino,
      s.componente,
      s.periodo_id,
      s.p_start,
      s.p_effective_end,
      array_agg(DISTINCT s.tempo_ordem::text || 'º TEMPO') AS tempos_array,
      COALESCE(SUM(public.count_weekdays_in_range(s.p_start, s.p_effective_end, s.dia_semana)), 0)::integer AS total_aulas
    FROM slots_distintos s
    GROUP BY
      s.professor_id,
      s.professor_nome,
      s.turma_id,
      s.turma_nome_completo,
      s.turma_turno,
      s.turma_ensino,
      s.componente,
      s.periodo_id,
      s.p_start,
      s.p_effective_end
  ),
  freq_counts AS (
    SELECT
      g.turma_id,
      g.componente,
      g.periodo_id,
      COUNT(DISTINCT (f.data, f.tempo))::integer AS freq_lancadas
    FROM grupos_agregados g
    LEFT JOIN public.frequencias f
      ON f.turma_id = g.turma_id
      AND f.disciplina = g.componente
      AND f.tempo = ANY(g.tempos_array)
      AND f.data::date >= g.p_start
      AND f.data::date <= g.p_effective_end
    GROUP BY g.turma_id, g.componente, g.periodo_id
  ),
  cont_counts AS (
    SELECT
      g.turma_id,
      g.componente,
      g.periodo_id,
      COUNT(DISTINCT (c.data, c.tempo))::integer AS cont_lancados
    FROM grupos_agregados g
    LEFT JOIN public.conteudos c
      ON c.turma_id = g.turma_id
      AND c.disciplina = g.componente
      AND c.tempo = ANY(g.tempos_array)
      AND c.data::date >= g.p_start
      AND c.data::date <= g.p_effective_end
    GROUP BY g.turma_id, g.componente, g.periodo_id
  ),
  alunos_por_turma AS (
    SELECT
      a.turma_id,
      COUNT(*)::integer AS total_alunos
    FROM public.alunos a
    GROUP BY a.turma_id
  ),
  avaliacoes_notas AS (
    SELECT
      g.turma_id,
      g.componente,
      g.periodo_id,
      COUNT(DISTINCT av.id)::integer AS total_avs,
      COUNT(n.id)::integer AS total_notas_lancadas
    FROM grupos_agregados g
    LEFT JOIN public.avaliacoes av
      ON av.turma_id = g.turma_id
      AND av.disciplina = g.componente
      AND (
        upper(av.bimestre) = upper(g.periodo_id)
        OR (
          upper(av.bimestre) LIKE '%' || substring(g.periodo_id from '^[0-9]+') || '%'
          AND upper(av.bimestre) LIKE '%BIMESTRE%'
        )
      )
    LEFT JOIN public.notas n
      ON n.avaliacao_id = av.id
    GROUP BY g.turma_id, g.componente, g.periodo_id
  )
  SELECT
    g.professor_nome AS professor,
    g.turma_id,
    CASE
      WHEN position(' ' in g.turma_nome_completo) > 0
        THEN split_part(g.turma_nome_completo, ' ', array_length(string_to_array(g.turma_nome_completo, ' '), 1))
      ELSE g.turma_nome_completo
    END AS turma,
    g.componente,
    g.periodo_id AS periodo,
    COALESCE(g.turma_turno, 'N/D') AS turno,
    COALESCE(g.turma_ensino, 'Ensino Fundamental') AS ensino,
    CASE
      WHEN position(' ' in g.turma_nome_completo) > 0
        THEN substring(g.turma_nome_completo from 1 for (length(g.turma_nome_completo) - length(split_part(g.turma_nome_completo, ' ', array_length(string_to_array(g.turma_nome_completo, ' '), 1))) - 1))
      ELSE g.turma_nome_completo
    END AS fase,
    g.total_aulas AS total_aulas_esperadas,
    COALESCE(fc.freq_lancadas, 0) AS frequencias_lancadas,
    COALESCE(cc.cont_lancados, 0) AS conteudos_lancados,
    -- Cálculo de pend_notas
    CASE
      WHEN COALESCE(an.total_avs, 0) > 0 AND COALESCE(apt.total_alunos, 0) > 0 THEN
        ROUND(
          GREATEST(0, (
            (an.total_avs * apt.total_alunos - COALESCE(an.total_notas_lancadas, 0))::numeric
            / (an.total_avs * apt.total_alunos)::numeric
          ) * 100),
          2
        )
      ELSE 0::numeric
    END AS pend_notas,
    -- Cálculo de pend_freq
    CASE
      WHEN g.total_aulas > 0 THEN
        ROUND(
          GREATEST(0, (
            (g.total_aulas - COALESCE(fc.freq_lancadas, 0))::numeric
            / g.total_aulas::numeric
          ) * 100),
          2
        )
      ELSE 0::numeric
    END AS pend_freq,
    -- Cálculo de pend_objeto
    CASE
      WHEN g.total_aulas > 0 THEN
        ROUND(
          GREATEST(0, (
            (g.total_aulas - COALESCE(cc.cont_lancados, 0))::numeric
            / g.total_aulas::numeric
          ) * 100),
          2
        )
      ELSE 0::numeric
    END AS pend_objeto
  FROM grupos_agregados g
  LEFT JOIN freq_counts fc
    ON fc.turma_id = g.turma_id AND fc.componente = g.componente AND fc.periodo_id = g.periodo_id
  LEFT JOIN cont_counts cc
    ON cc.turma_id = g.turma_id AND cc.componente = g.componente AND cc.periodo_id = g.periodo_id
  LEFT JOIN alunos_por_turma apt
    ON apt.turma_id = g.turma_id
  LEFT JOIN avaliacoes_notas an
    ON an.turma_id = g.turma_id AND an.componente = g.componente AND an.periodo_id = g.periodo_id
  ORDER BY g.professor_nome, g.turma_nome_completo, g.componente;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pendencias_docentes(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pendencias_docentes(uuid, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pendencias_docentes(uuid, jsonb, text) TO authenticated;

-- =============================================================
-- 5. CHECK CONSTRAINTS COM NOT VALID PARA FORMATO DE DATA (PRIORIDADE 7)
-- =============================================================
-- Adiciona proteção em nível de banco para que novas inserções sigam o formato
-- estrito YYYY-MM-DD, usando NOT VALID para não causar locks em dados legados.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_frequencias_data_format'
  ) THEN
    ALTER TABLE public.frequencias
      ADD CONSTRAINT chk_frequencias_data_format
      CHECK (data ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_conteudos_data_format'
  ) THEN
    ALTER TABLE public.conteudos
      ADD CONSTRAINT chk_conteudos_data_format
      CHECK (data ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_avaliacoes_data_format'
  ) THEN
    ALTER TABLE public.avaliacoes
      ADD CONSTRAINT chk_avaliacoes_data_format
      CHECK (data ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') NOT VALID;
  END IF;
END $$;
