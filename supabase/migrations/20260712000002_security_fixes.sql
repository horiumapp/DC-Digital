-- =============================================================
-- DC Digital -- Correções de Segurança e RLS
-- Migration: 20260712000002_security_fixes.sql
-- =============================================================

-- ---------------------------------------------------------------
-- 1. CORRIGIR get_user_role() e get_user_role_secure()
--    Fallback padrão 'PROFESSOR' é perigoso: concede permissões de
--    escrita a qualquer usuário sem role definido.
--    Novo comportamento: retornar NULL → RLS nega acesso por padrão.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'),
    (SELECT cargo FROM public.usuarios WHERE id = (SELECT auth.uid()))
    -- REMOVIDO: fallback 'PROFESSOR' — usuário sem role é bloqueado pelo RLS
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_secure()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'),
    (SELECT cargo FROM public.usuarios WHERE id = (SELECT auth.uid()))
    -- REMOVIDO: fallback 'PROFESSOR' — usuário sem role é bloqueado pelo RLS
  );
$function$;

-- ---------------------------------------------------------------
-- 2. CORRIGIR gerar_matricula_aluno()
--    Substituir EPOCH % 9999999 (colisão a cada ~115 dias) por
--    uma SEQUENCE PostgreSQL garantidamente única.
-- ---------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.seq_matricula_aluno
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.gerar_matricula_aluno()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  ano_atual INT := EXTRACT(YEAR FROM NOW());
  seq_num   TEXT;
BEGIN
  IF NEW.matricula IS NULL OR NEW.matricula = '' THEN
    seq_num    := LPAD(nextval('public.seq_matricula_aluno')::text, 7, '0');
    NEW.matricula := ano_atual::text || '/' || seq_num;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------
-- 3. ADICIONAR usuario_id À TABELA professores
--    Permitirá que as políticas RLS usem UUID em vez de email,
--    evitando quebra de acesso quando o professor atualiza o email.
-- ---------------------------------------------------------------
ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professores_usuario_id
  ON public.professores (usuario_id);

-- ---------------------------------------------------------------
-- 4. TIGHTEN RLS: auth_select_alunos para PROFESSOR
--    Um professor deve ver APENAS alunos das suas turmas,
--    não todos os alunos da escola.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "auth_select_alunos" ON public.alunos;
CREATE POLICY "auth_select_alunos" ON public.alunos
  FOR SELECT
  USING (
    -- ADMIN e equipe administrativa veem tudo na sua escola
    is_admin_or_staff()
    OR
    -- PROFESSOR: apenas alunos de turmas em que ele leciona
    (
      (SELECT get_user_role()) = 'PROFESSOR'
      AND EXISTS (
        SELECT 1
        FROM professor_horarios ph
        JOIN professores p ON ph.professor_id = p.id
        WHERE
          ph.turma_id = alunos.turma_id
          AND (
            -- Preferir correspondência por usuario_id (UUID, seguro)
            (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
            -- Fallback para email enquanto usuario_id ainda não foi populado
            OR (p.usuario_id IS NULL AND p.email = (auth.jwt() ->> 'email'))
          )
      )
    )
    OR
    -- Portal do aluno: aluno vê apenas seus próprios dados
    (
      (SELECT get_user_role()) = 'ALUNO'
      AND id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 5. ATUALIZAR políticas de frequencias, conteudos, avaliacoes e
--    notas para PRIORIZAR usuario_id sobre email nos joins.
--    O fallback por email é mantido durante a transição.
-- ---------------------------------------------------------------

-- Helper reutilizável: professor tem acesso à turma?
-- (Usado para não duplicar lógica em todas as policies)
CREATE OR REPLACE FUNCTION public.professor_tem_acesso_a_turma(p_turma_id uuid)
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
  );
$function$;

GRANT EXECUTE ON FUNCTION public.professor_tem_acesso_a_turma(uuid) TO authenticated;

-- === frequencias ===

DROP POLICY IF EXISTS "professor_pode_inserir_propria_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_inserir_propria_frequencia" ON public.frequencias
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = frequencias.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(frequencias.turma_id)
  );

DROP POLICY IF EXISTS "professor_pode_editar_propria_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_editar_propria_frequencia" ON public.frequencias
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = frequencias.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(frequencias.turma_id)
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = frequencias.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(frequencias.turma_id)
  );

DROP POLICY IF EXISTS "professor_pode_deletar_propria_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_deletar_propria_frequencia" ON public.frequencias
  FOR DELETE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = frequencias.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(frequencias.turma_id)
  );

-- === conteudos ===

DROP POLICY IF EXISTS "professor_pode_inserir_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_inserir_proprio_conteudo" ON public.conteudos
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = conteudos.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(conteudos.turma_id)
  );

DROP POLICY IF EXISTS "professor_pode_editar_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_editar_proprio_conteudo" ON public.conteudos
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = conteudos.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(conteudos.turma_id)
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = conteudos.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(conteudos.turma_id)
  );

DROP POLICY IF EXISTS "professor_pode_deletar_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_deletar_proprio_conteudo" ON public.conteudos
  FOR DELETE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = conteudos.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(conteudos.turma_id)
  );

-- === avaliacoes ===

DROP POLICY IF EXISTS "professor_pode_inserir_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_inserir_propria_avaliacao" ON public.avaliacoes
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = avaliacoes.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(avaliacoes.turma_id)
  );

DROP POLICY IF EXISTS "professor_pode_editar_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_editar_propria_avaliacao" ON public.avaliacoes
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = avaliacoes.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(avaliacoes.turma_id)
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = avaliacoes.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(avaliacoes.turma_id)
  );

DROP POLICY IF EXISTS "professor_pode_deletar_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_deletar_propria_avaliacao" ON public.avaliacoes
  FOR DELETE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = avaliacoes.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(avaliacoes.turma_id)
  );

-- === notas ===

DROP POLICY IF EXISTS "professor_pode_inserir_propria_nota" ON public.notas;
CREATE POLICY "professor_pode_inserir_propria_nota" ON public.notas
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1
      FROM avaliacoes av JOIN turmas t ON av.turma_id = t.id
      WHERE av.id = notas.avaliacao_id AND t.escola_id = get_user_escola_id()
    ))
    OR EXISTS (
      SELECT 1 FROM avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND professor_tem_acesso_a_turma(av.turma_id)
    )
  );

DROP POLICY IF EXISTS "professor_pode_editar_propria_nota" ON public.notas;
CREATE POLICY "professor_pode_editar_propria_nota" ON public.notas
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1
      FROM avaliacoes av JOIN turmas t ON av.turma_id = t.id
      WHERE av.id = notas.avaliacao_id AND t.escola_id = get_user_escola_id()
    ))
    OR EXISTS (
      SELECT 1 FROM avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND professor_tem_acesso_a_turma(av.turma_id)
    )
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1
      FROM avaliacoes av JOIN turmas t ON av.turma_id = t.id
      WHERE av.id = notas.avaliacao_id AND t.escola_id = get_user_escola_id()
    ))
    OR EXISTS (
      SELECT 1 FROM avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND professor_tem_acesso_a_turma(av.turma_id)
    )
  );

DROP POLICY IF EXISTS "professor_pode_deletar_propria_nota" ON public.notas;
CREATE POLICY "professor_pode_deletar_propria_nota" ON public.notas
  FOR DELETE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1
      FROM avaliacoes av JOIN turmas t ON av.turma_id = t.id
      WHERE av.id = notas.avaliacao_id AND t.escola_id = get_user_escola_id()
    ))
    OR EXISTS (
      SELECT 1 FROM avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND professor_tem_acesso_a_turma(av.turma_id)
    )
  );

-- === fechamentos_bimestres ===

DROP POLICY IF EXISTS "staff_ou_professor_insert_fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "staff_ou_professor_insert_fechamentos" ON public.fechamentos_bimestres
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = fechamentos_bimestres.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(fechamentos_bimestres.turma_id)
  );

DROP POLICY IF EXISTS "staff_ou_professor_update_fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "staff_ou_professor_update_fechamentos" ON public.fechamentos_bimestres
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = fechamentos_bimestres.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(fechamentos_bimestres.turma_id)
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND EXISTS (
      SELECT 1 FROM turmas t WHERE t.id = fechamentos_bimestres.turma_id AND t.escola_id = get_user_escola_id()
    ))
    OR professor_tem_acesso_a_turma(fechamentos_bimestres.turma_id)
  );

-- ---------------------------------------------------------------
-- 6. REMOVER política duplicada de admin_whitelist
--    admin_select_whitelist e admin_manage_whitelist (FOR ALL)
--    cobrem o mesmo escopo; manter apenas a política granular.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "admin_select_whitelist" ON public.admin_whitelist;
-- admin_manage_whitelist (FOR ALL) já cobre SELECT, INSERT, UPDATE, DELETE

-- ---------------------------------------------------------------
-- 7. GRANTS para a nova função helper
-- ---------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.professor_tem_acesso_a_turma(uuid) TO authenticated;
