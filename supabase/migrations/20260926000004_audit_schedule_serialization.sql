BEGIN;
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

  PERFORM pg_advisory_xact_lock(hashtextextended('schedule:'||p_professor_id::text,0));
  IF jsonb_typeof(p_horarios) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Horários devem ser uma lista';
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

      IF v_dia_semana NOT BETWEEN 0 AND 6 OR v_tempo_ordem NOT BETWEEN 1 AND 20 OR v_componente='' THEN
        RAISE EXCEPTION 'Dia, tempo ou componente inválido';
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


COMMIT;
