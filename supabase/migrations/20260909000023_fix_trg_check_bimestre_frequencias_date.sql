-- =============================================================================
-- Migration: 20260909000023_fix_trg_check_bimestre_frequencias_date.sql
-- Descrição: Corrige a validação temporal de bimestres fechados em frequências e notas.
--
-- Problema corrigido:
-- 1. trg_check_bimestre_aberto_frequencias bloqueava mutações se QUALQUER bimestre
--    estivesse fechado para a turma/disciplina, mesmo que o lançamento pertencesse
--    a outro bimestre aberto (ex: 3º Bimestre bloqueado porque 1º estava fechado).
-- 2. Divergência textual de bimestres ("1. BIMESTRE" vs "1º Bimestre") impedia
--    comparação precisa entre tabelas e frontend.
-- =============================================================================

BEGIN;

-- 1. Função auxiliar para extrair o número do bimestre a partir de uma data
CREATE OR REPLACE FUNCTION public.get_bimestre_numero_por_data(p_data text)
  RETURNS integer
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO 'public'
AS $$
DECLARE
  v_date date;
  v_mmdd text;
BEGIN
  IF p_data IS NULL OR p_data = '' THEN
    RETURN NULL;
  END IF;

  -- Interpretar formatos ISO (YYYY-MM-DD) ou brasileiro (DD/MM/YYYY)
  IF p_data ~ '^\d{4}-\d{2}-\d{2}' THEN
    v_date := substring(p_data from 1 for 10)::date;
  ELSIF p_data ~ '^\d{2}/\d{2}/\d{4}' THEN
    v_date := to_date(substring(p_data from 1 for 10), 'DD/MM/YYYY');
  ELSE
    RETURN NULL;
  END IF;

  v_mmdd := to_char(v_date, 'MM-DD');

  -- Calendário letivo:
  -- 1º Bimestre: 05/02 a 23/04
  -- 2º Bimestre: 24/04 a 07/07
  -- 3º Bimestre: 16/07 a 24/09
  -- 4º Bimestre: 25/09 a 14/12
  IF v_mmdd >= '02-05' AND v_mmdd <= '04-23' THEN
    RETURN 1;
  ELSIF v_mmdd >= '04-24' AND v_mmdd <= '07-07' THEN
    RETURN 2;
  ELSIF v_mmdd >= '07-16' AND v_mmdd <= '09-24' THEN
    RETURN 3;
  ELSIF v_mmdd >= '09-25' AND v_mmdd <= '12-14' THEN
    RETURN 4;
  ELSE
    RETURN NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_bimestre_numero_por_data(text) IS
  'Retorna o número do bimestre (1 a 4) com base na data do calendário letivo, ou NULL se fora dos períodos letivos.';

-- 2. Correção do trigger de frequências (validação temporal por data do registro)
CREATE OR REPLACE FUNCTION public.trg_check_bimestre_aberto_frequencias()
  RETURNS trigger
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_bim_num integer;
BEGIN
  -- ADMIN é isento para permitir correções administrativas
  IF (SELECT public.get_user_role()) = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Determinar o número do bimestre correspondente à data da frequência
  v_bim_num := public.get_bimestre_numero_por_data(NEW.data);

  -- Se a data não pertencer a um bimestre (ex: recesso/férias), não aplica bloqueio de bimestre
  IF v_bim_num IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar se existe fechamento ativo para esta turma + disciplina + bimestre específico
  IF EXISTS (
    SELECT 1 FROM public.fechamentos_bimestres fb
    WHERE fb.turma_id = NEW.turma_id
      AND fb.disciplina = NEW.disciplina
      AND fb.status = 'FECHADO'
      AND (
        fb.bimestre LIKE (v_bim_num || '.%')
        OR fb.bimestre LIKE (v_bim_num || 'º%')
        OR fb.bimestre = v_bim_num::text
      )
  ) THEN
    RAISE EXCEPTION 'Operação bloqueada: o período letivo desta turma e disciplina já foi fechado pela secretaria. Solicite a reabertura do bimestre para realizar alterações.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_check_bimestre_aberto_frequencias() IS
  'SEC-03 FIX: Impede INSERT/UPDATE em frequencias quando o bimestre específico da data da frequência '
  'está fechado. Não bloqueia lançamentos em outros bimestres abertos. ADMIN é isento.';

-- 3. Correção do trigger de notas (normalização de formatos de bimestre)
CREATE OR REPLACE FUNCTION public.trg_check_bimestre_aberto_notas()
  RETURNS trigger
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_turma_id uuid;
  v_disciplina text;
  v_bimestre text;
  v_bim_num integer;
BEGIN
  -- ADMIN é isento para permitir correções administrativas
  IF (SELECT public.get_user_role()) = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Obter turma, disciplina e bimestre da avaliação pai
  SELECT av.turma_id, av.disciplina, av.bimestre
    INTO v_turma_id, v_disciplina, v_bimestre
    FROM public.avaliacoes av
    WHERE av.id = NEW.avaliacao_id;

  -- Se a avaliação não existe, deixar a FK constraint tratar
  IF v_turma_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extrair número do bimestre se presente no texto (ex: "1. BIMESTRE", "1º Bimestre" -> 1)
  IF v_bimestre ~ '^[1-4]' THEN
    v_bim_num := substring(v_bimestre from '^[1-4]')::integer;
  END IF;

  -- Verificar fechamento para turma + disciplina + bimestre
  IF v_bimestre IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.fechamentos_bimestres fb
    WHERE fb.turma_id = v_turma_id
      AND fb.disciplina = v_disciplina
      AND fb.status = 'FECHADO'
      AND (
        fb.bimestre = v_bimestre
        OR (v_bim_num IS NOT NULL AND (
          fb.bimestre LIKE (v_bim_num || '.%')
          OR fb.bimestre LIKE (v_bim_num || 'º%')
          OR fb.bimestre = v_bim_num::text
        ))
      )
  ) THEN
    RAISE EXCEPTION 'Operação bloqueada: as notas deste bimestre já foram fechadas pela secretaria. Solicite a reabertura do bimestre para realizar alterações.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_check_bimestre_aberto_notas() IS
  'SEC-03 FIX: Impede INSERT/UPDATE em notas quando o bimestre da avaliação pai está fechado, '
  'com suporte a diferentes formatos textuais de identificação de bimestre. ADMIN é isento.';

-- 4. Reaplicar triggers nas tabelas
DROP TRIGGER IF EXISTS check_bimestre_frequencias_trigger ON public.frequencias;
CREATE TRIGGER check_bimestre_frequencias_trigger
  BEFORE INSERT OR UPDATE ON public.frequencias
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_bimestre_aberto_frequencias();

DROP TRIGGER IF EXISTS check_bimestre_notas_trigger ON public.notas;
CREATE TRIGGER check_bimestre_notas_trigger
  BEFORE INSERT OR UPDATE ON public.notas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_bimestre_aberto_notas();

COMMIT;
