-- =============================================================
-- DC Digital — Fix Foreign Key Cascade & RLS Professor por Disciplina
-- Migration: 20260918000026_fix_notas_fk_cascade_and_professor_rls_discipline.sql
-- =============================================================
--
-- 1. NOTAS FK CASCADE (DATA-05):
--    Adiciona ON DELETE CASCADE à constraint notas_avaliacao_id_fkey
--    para evitar erro Postgres 23503 ao remover avaliações que possuem
--    notas associadas, prevenindo o congelamento da operação em dead-letter.
--
-- 2. PROFESSOR RLS POR DISCIPLINA (SEC-01):
--    Cria helper public.professor_tem_acesso_a_turma_disciplina()
--    e atualiza as políticas de INSERT, UPDATE e DELETE em:
--    - avaliacoes
--    - conteudos
--    - frequencias
--    - notas
--    Garante que um professor de uma matéria (ex: História) não possa
--    alterar ou deletar avaliações, frequências, conteúdos ou notas
--    de outro professor (ex: Matemática) na mesma turma.
--    Professores POLIVALENTE e ADMIN/STAFF continuam com permissão ampla.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. FOREIGN KEY CASCADE EM NOTAS (DATA-05)
-- ---------------------------------------------------------------
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_avaliacao_id_fkey;
ALTER TABLE public.notas ADD CONSTRAINT notas_avaliacao_id_fkey
  FOREIGN KEY (avaliacao_id) REFERENCES public.avaliacoes(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------
-- 2. HELPER: PROFESSOR TEM ACESSO À TURMA E DISCIPLINA (SEC-01)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.professor_tem_acesso_a_turma_disciplina(
  p_turma_id uuid,
  p_disciplina text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM professor_horarios ph
    JOIN professores p ON ph.professor_id = p.id
    WHERE
      ph.turma_id = p_turma_id
      AND (
        (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
        OR (p.usuario_id IS NULL AND p.email = (auth.jwt() ->> 'email'))
      )
      AND (
        p_disciplina IS NULL
        OR p_disciplina = ''
        OR TRIM(LOWER(ph.componente)) = TRIM(LOWER(p_disciplina))
        OR (p.disciplinas IS NOT NULL AND (
          p.disciplinas @> ARRAY[p_disciplina]::text[]
          OR 'POLIVALENTE' = ANY(p.disciplinas)
        ))
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.professor_tem_acesso_a_turma_disciplina(uuid, text) TO authenticated;

-- ---------------------------------------------------------------
-- 3. AVALIACOES — ATUALIZAR POLÍTICAS COM ESCOPO DE DISCIPLINA
-- ---------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "professor_pode_inserir_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_inserir_propria_avaliacao" ON public.avaliacoes
  FOR INSERT
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = avaliacoes.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(avaliacoes.turma_id, avaliacoes.disciplina)
  );

-- UPDATE
DROP POLICY IF EXISTS "professor_pode_editar_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_editar_propria_avaliacao" ON public.avaliacoes
  FOR UPDATE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = avaliacoes.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(avaliacoes.turma_id, avaliacoes.disciplina)
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = avaliacoes.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(avaliacoes.turma_id, avaliacoes.disciplina)
  );

-- DELETE
DROP POLICY IF EXISTS "professor_pode_deletar_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_deletar_propria_avaliacao" ON public.avaliacoes
  FOR DELETE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = avaliacoes.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(avaliacoes.turma_id, avaliacoes.disciplina)
  );

-- ---------------------------------------------------------------
-- 4. CONTEUDOS — ATUALIZAR POLÍTICAS COM ESCOPO DE DISCIPLINA
-- ---------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "professor_pode_inserir_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_inserir_conteudo" ON public.conteudos
  FOR INSERT
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = conteudos.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(conteudos.turma_id, conteudos.disciplina)
  );

-- UPDATE
DROP POLICY IF EXISTS "professor_pode_editar_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_editar_conteudo" ON public.conteudos
  FOR UPDATE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = conteudos.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(conteudos.turma_id, conteudos.disciplina)
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = conteudos.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(conteudos.turma_id, conteudos.disciplina)
  );

-- DELETE
DROP POLICY IF EXISTS "professor_pode_deletar_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_deletar_conteudo" ON public.conteudos
  FOR DELETE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = conteudos.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(conteudos.turma_id, conteudos.disciplina)
  );

-- ---------------------------------------------------------------
-- 5. FREQUENCIAS — ATUALIZAR POLÍTICAS COM ESCOPO DE DISCIPLINA
-- ---------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "professor_pode_inserir_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_inserir_frequencia" ON public.frequencias
  FOR INSERT
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(frequencias.turma_id, frequencias.disciplina)
  );

-- UPDATE
DROP POLICY IF EXISTS "professor_pode_editar_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_editar_frequencia" ON public.frequencias
  FOR UPDATE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(frequencias.turma_id, frequencias.disciplina)
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(frequencias.turma_id, frequencias.disciplina)
  );

-- DELETE
DROP POLICY IF EXISTS "professor_pode_deletar_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_deletar_frequencia" ON public.frequencias
  FOR DELETE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(frequencias.turma_id, frequencias.disciplina)
  );

-- ---------------------------------------------------------------
-- 6. NOTAS — ATUALIZAR POLÍTICAS COM ESCOPO DE DISCIPLINA DA AVALIAÇÃO
-- ---------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "professor_pode_inserir_nota" ON public.notas;
CREATE POLICY "professor_pode_inserir_nota" ON public.notas
  FOR INSERT
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av
        JOIN public.turmas t ON av.turma_id = t.id
        WHERE av.id = notas.avaliacao_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma_disciplina(av.turma_id, av.disciplina)
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "professor_pode_editar_nota" ON public.notas;
CREATE POLICY "professor_pode_editar_nota" ON public.notas
  FOR UPDATE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av
        JOIN public.turmas t ON av.turma_id = t.id
        WHERE av.id = notas.avaliacao_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma_disciplina(av.turma_id, av.disciplina)
    )
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av
        JOIN public.turmas t ON av.turma_id = t.id
        WHERE av.id = notas.avaliacao_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma_disciplina(av.turma_id, av.disciplina)
    )
  );

-- DELETE
DROP POLICY IF EXISTS "professor_pode_deletar_nota" ON public.notas;
CREATE POLICY "professor_pode_deletar_nota" ON public.notas
  FOR DELETE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av
        JOIN public.turmas t ON av.turma_id = t.id
        WHERE av.id = notas.avaliacao_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma_disciplina(av.turma_id, av.disciplina)
    )
  );
