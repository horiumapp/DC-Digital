-- =============================================================
-- DC Digital — Fix RLS: Professor identificado por auth.uid()
-- Migration: 20260820000014_fix_rls_professor_by_uid.sql
-- =============================================================
--
-- PROBLEMA: As políticas de INSERT, UPDATE e DELETE em avaliacoes,
--   conteudos e frequencias identificam o professor pelo campo
--   `email` do JWT (auth.jwt() ->> 'email'), via JOIN com
--   professores.email.
--
--   Isso é frágil porque:
--   1. Se o email do professor for alterado, o acesso quebra.
--   2. Dois registros com o mesmo email em professores causam
--      comportamento imprevisível.
--   3. A migration 20260814000013 já unificou os SELECTs para
--      usar auth.uid() via professor_tem_acesso_a_turma(), mas
--      os escritas ainda usam o padrão legado de email.
--
-- SOLUÇÃO: Substituir a comparação por email pela função
--   professor_tem_acesso_a_turma(turma_id), que usa auth.uid()
--   internamente e é imune a mudanças de email.
--
-- COMPATIBILIDADE: Nenhuma quebra — a função
--   professor_tem_acesso_a_turma() já existe desde a migration
--   20260814000013 e está em uso nos SELECTs.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. AVALIACOES — INSERT, UPDATE, DELETE
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
    -- FIX S4: usa auth.uid() via professor_tem_acesso_a_turma() em vez de email
    OR public.professor_tem_acesso_a_turma(avaliacoes.turma_id)
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
    OR public.professor_tem_acesso_a_turma(avaliacoes.turma_id)
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
    OR public.professor_tem_acesso_a_turma(avaliacoes.turma_id)
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
    OR public.professor_tem_acesso_a_turma(avaliacoes.turma_id)
  );

-- ---------------------------------------------------------------
-- 2. CONTEUDOS — INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "professor_pode_inserir_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_inserir_proprio_conteudo" ON public.conteudos
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
    -- FIX S4: usa auth.uid() via professor_tem_acesso_a_turma()
    OR public.professor_tem_acesso_a_turma(conteudos.turma_id)
  );

-- UPDATE
DROP POLICY IF EXISTS "professor_pode_editar_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_editar_proprio_conteudo" ON public.conteudos
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
    OR public.professor_tem_acesso_a_turma(conteudos.turma_id)
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
    OR public.professor_tem_acesso_a_turma(conteudos.turma_id)
  );

-- DELETE
DROP POLICY IF EXISTS "professor_pode_deletar_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_deletar_proprio_conteudo" ON public.conteudos
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
    OR public.professor_tem_acesso_a_turma(conteudos.turma_id)
  );

-- ---------------------------------------------------------------
-- 3. FREQUENCIAS — INSERT, UPDATE, DELETE
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
    -- FIX S4: usa auth.uid() via professor_tem_acesso_a_turma()
    OR public.professor_tem_acesso_a_turma(frequencias.turma_id)
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
    OR public.professor_tem_acesso_a_turma(frequencias.turma_id)
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
    OR public.professor_tem_acesso_a_turma(frequencias.turma_id)
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
    OR public.professor_tem_acesso_a_turma(frequencias.turma_id)
  );

-- ---------------------------------------------------------------
-- 4. NOTAS — INSERT, UPDATE, DELETE (acesso via avaliacoes)
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
    -- FIX S4: usa auth.uid() via professor_tem_acesso_a_turma()
    OR EXISTS (
      SELECT 1 FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma(av.turma_id)
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
        AND public.professor_tem_acesso_a_turma(av.turma_id)
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
        AND public.professor_tem_acesso_a_turma(av.turma_id)
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
        AND public.professor_tem_acesso_a_turma(av.turma_id)
    )
  );
