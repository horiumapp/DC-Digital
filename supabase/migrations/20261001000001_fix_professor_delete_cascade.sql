-- =============================================================
-- DC Digital — Correção de Exclusão de Professor com Cascade (Issue Foreign Key)
-- Migration: 20261001000001_fix_professor_delete_cascade.sql
-- =============================================================

-- 1. Atualizar Foreign Keys de professor_alocacoes e professor_horarios para ON DELETE CASCADE
ALTER TABLE public.professor_alocacoes
  DROP CONSTRAINT IF EXISTS professor_alocacoes_professor_id_fkey;

ALTER TABLE public.professor_alocacoes
  ADD CONSTRAINT professor_alocacoes_professor_id_fkey
  FOREIGN KEY (professor_id)
  REFERENCES public.professores(id)
  ON DELETE CASCADE;

ALTER TABLE public.professor_horarios
  DROP CONSTRAINT IF EXISTS professor_horarios_professor_id_fkey;

ALTER TABLE public.professor_horarios
  ADD CONSTRAINT professor_horarios_professor_id_fkey
  FOREIGN KEY (professor_id)
  REFERENCES public.professores(id)
  ON DELETE CASCADE;

-- 2. RPC transacional para exclusão atômica de professor pelo ADMIN
CREATE OR REPLACE FUNCTION public.admin_excluir_professor(
  p_professor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF public.get_user_role() <> 'ADMIN' THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir professores permanentemente' USING ERRCODE = '42501';
  END IF;

  -- Remove dependências de grade e alocação explicitamente antes do mestre
  DELETE FROM public.professor_horarios WHERE professor_id = p_professor_id;
  DELETE FROM public.professor_alocacoes WHERE professor_id = p_professor_id;
  DELETE FROM public.professores WHERE id = p_professor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_excluir_professor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_excluir_professor(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_excluir_professor(uuid) TO authenticated;
