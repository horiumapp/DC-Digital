-- =============================================================================
-- Migration: 20260909000022_security_fix_fechamento_rls_and_triggers.sql
-- Descrição: Correções de segurança SEC-02 e SEC-03 da auditoria estática.
--
-- SEC-02: A política RLS "staff_delete_fechamentos" em fechamentos_bimestres
--         utilizava p_acesso_por_turma(), que concede acesso a ALUNO e PROFESSOR.
--         Isso permitia que qualquer aluno/professor da turma executasse DELETE
--         via REST e reabrisse bimestres fechados pela secretaria.
--         FIX: Exigir papel administrativo (ADMIN, GESTOR, SECRETARIO) + vínculo.
--
-- SEC-03: A trava que impede modificação de notas/frequências em bimestres
--         fechados existia apenas na interface React (TurmaContext.tsx).
--         Um professor podia contornar a UI via REST direto ou sync offline.
--         FIX: Criar triggers BEFORE INSERT/UPDATE que rejeitam mutações em
--         tabelas de dados acadêmicos quando o bimestre está fechado.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SEC-02: Corrigir política RLS de DELETE em fechamentos_bimestres
-- =============================================================================

DROP POLICY IF EXISTS "staff_delete_fechamentos" ON public.fechamentos_bimestres;
DROP POLICY IF EXISTS "admin_delete_fechamentos" ON public.fechamentos_bimestres;

CREATE POLICY "staff_delete_fechamentos" ON public.fechamentos_bimestres
  FOR DELETE
  USING (
    (SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR', 'SECRETARIO')
    AND public.p_acesso_por_turma(fechamentos_bimestres.turma_id)
  );

COMMENT ON POLICY "staff_delete_fechamentos" ON public.fechamentos_bimestres IS
  'SEC-02 FIX: Apenas ADMIN, GESTOR e SECRETARIO podem reabrir bimestres (DELETE). '
  'Antes, p_acesso_por_turma() era suficiente sozinha, permitindo que ALUNO e PROFESSOR '
  'da turma executassem DELETE via REST direto, ignorando o gate do frontend.';

-- =============================================================================
-- SEC-03: Trigger de integridade temporal — impedir mutações em bimestres fechados
-- =============================================================================

-- Função auxiliar para frequências (turma_id e disciplina diretos na tabela)
CREATE OR REPLACE FUNCTION public.trg_check_bimestre_aberto_frequencias()
  RETURNS trigger
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- ADMIN é isento para permitir correções administrativas
  IF (SELECT public.get_user_role()) = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Verificar se existe fechamento ativo para esta turma + disciplina
  IF EXISTS (
    SELECT 1 FROM public.fechamentos_bimestres fb
    WHERE fb.turma_id = NEW.turma_id
      AND fb.disciplina = NEW.disciplina
      AND fb.status = 'FECHADO'
  ) THEN
    RAISE EXCEPTION 'Operação bloqueada: o período letivo desta turma e disciplina já foi fechado pela secretaria. Solicite a reabertura do bimestre para realizar alterações.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_check_bimestre_aberto_frequencias() IS
  'SEC-03 FIX: Impede INSERT/UPDATE em frequencias quando o bimestre da turma+disciplina '
  'está fechado. ADMIN é isento para correções administrativas.';

-- Função auxiliar para notas (turma_id e disciplina vêm da avaliação pai)
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

  -- Verificar fechamento para turma + disciplina + bimestre
  IF v_bimestre IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.fechamentos_bimestres fb
    WHERE fb.turma_id = v_turma_id
      AND fb.disciplina = v_disciplina
      AND fb.bimestre = v_bimestre
      AND fb.status = 'FECHADO'
  ) THEN
    RAISE EXCEPTION 'Operação bloqueada: as notas deste bimestre já foram fechadas pela secretaria. Solicite a reabertura do bimestre para realizar alterações.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_check_bimestre_aberto_notas() IS
  'SEC-03 FIX: Impede INSERT/UPDATE em notas quando o bimestre da avaliação pai '
  'está fechado. Usa JOIN com avaliacoes para obter turma/disciplina/bimestre. '
  'ADMIN é isento para correções administrativas.';

-- Aplicar triggers nas tabelas

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
