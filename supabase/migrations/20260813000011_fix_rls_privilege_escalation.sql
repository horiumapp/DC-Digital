-- =============================================================
-- DC Digital — Fix RLS: Previne escalonamento de privilégio (C1/M4)
-- Migration: 20260813000011_fix_rls_privilege_escalation.sql
-- =============================================================
--
-- PROBLEMA (C1): A política admin_update_usuarios permitia que
--   GESTOR/SECRETARIO promovessem a PRÓPRIA linha para cargo 'ADMIN'.
--   O ramo `is_admin_or_staff() AND escola_id = get_user_escola_id()`
--   é sempre verdadeiro para a própria linha do funcionário, então o
--   WITH CHECK passava independentemente do cargo informado. O trigger
--   sync_user_cargo_to_auth propagava o novo cargo para o JWT,
--   concedendo acesso total.
--
-- PROBLEMA (M4): O mesmo ramo permitia alterar o próprio escola_id,
--   viabilizando escrita cruzada entre escolas (vazar para outra escola
--   e lá criar/editar turmas, alunos etc.).
--
-- SOLUÇÃO:
--   1. Funcionários NÃO podem atualizar a própria linha em usuarios.
--   2. Funcionários só atualizam/inserem usuários da própria escola
--      (escola_id = get_user_escola_id()); ao desvincular, escola_id NULL
--      é permitido (remoção de acesso, não escalação).
--   3. Funcionários só atribuem cargos dentro da hierarquia via helper
--      p_cargo_compativel(cargo) — nunca ADMIN e nunca acima do seu nível.
--
-- H1 (isolamento por escola nas LEITURAS de SECRETARIO):
--   ADMIN e GESTOR mantêm visão sistêmica (definido no README).
--   SECRETARIO passa a enxergar apenas a própria escola em todas as
--   tabelas pedagógicas. PROFESSOR e ALUNO inalterados.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. HELPERS
-- ---------------------------------------------------------------

-- Cargo que o usuário logado pode atribuir a outro usuário.
-- ADMIN: qualquer. GESTOR: abaixo de ADMIN. SECRETARIO: PROFESSOR/ALUNO.
CREATE OR REPLACE FUNCTION public.p_cargo_compativel(p_cargo text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      (SELECT public.get_user_role()) = 'GESTOR'
      AND p_cargo IN ('SECRETARIO', 'PROFESSOR', 'ALUNO')
    )
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND p_cargo IN ('PROFESSOR', 'ALUNO')
    )
    OR (
      (SELECT public.get_user_role()) = 'PROFESSOR'
      AND p_cargo = 'PROFESSOR'
    );
$function$;

-- Escola que o usuário logado pode LER/ADMINISTRAR.
-- ADMIN e GESTOR: todas (visão sistêmica). SECRETARIO: apenas a própria.
CREATE OR REPLACE FUNCTION public.p_escola_permitida(p_escola_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND p_escola_id = get_user_escola_id()
    );
$function$;

-- Acesso a dados vinculados a uma turma (frequencias, notas, etc.).
CREATE OR REPLACE FUNCTION public.p_acesso_por_turma(p_turma_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = p_turma_id AND t.escola_id = get_user_escola_id()
      )
    );
$function$;

GRANT EXECUTE ON FUNCTION public.p_cargo_compativel(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.p_escola_permitida(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.p_acesso_por_turma(uuid) TO authenticated;

-- ---------------------------------------------------------------
-- 2. usuarios — INSERT/UPDATE (fix C1 + M4)
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "admin_update_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_usuarios" ON public.usuarios
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (
      is_admin_or_staff()
      AND id != auth.uid()                      -- funcionário nunca altera a própria linha
      AND escola_id = get_user_escola_id()
    )
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (
      is_admin_or_staff()
      AND id != auth.uid()
      AND (escola_id = get_user_escola_id() OR escola_id IS NULL)
      AND p_cargo_compativel(cargo)
    )
  );

DROP POLICY IF EXISTS "admin_insert_usuarios" ON public.usuarios;
CREATE POLICY "admin_insert_usuarios" ON public.usuarios
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (
      is_admin_or_staff()
      AND escola_id = get_user_escola_id()
      AND p_cargo_compativel(cargo)
    )
  );

-- ---------------------------------------------------------------
-- 3. LEITURAS — isolamento por escola para SECRETARIO (H1)
-- ---------------------------------------------------------------

-- usuarios: próprio usuário sempre; ADMIN/GESTOR todos; SECRETARIO só da escola
DROP POLICY IF EXISTS "auth_select_usuarios" ON public.usuarios;
CREATE POLICY "auth_select_usuarios" ON public.usuarios
  FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT get_user_role()) = 'SECRETARIO'
      AND escola_id = get_user_escola_id()
    )
  );

-- escolas
DROP POLICY IF EXISTS "auth_select_escolas" ON public.escolas;
CREATE POLICY "auth_select_escolas" ON public.escolas
  FOR SELECT
  USING (p_escola_permitida(id) OR id = get_user_escola_id());

-- alunos
DROP POLICY IF EXISTS "auth_select_alunos" ON public.alunos;
CREATE POLICY "auth_select_alunos" ON public.alunos
  FOR SELECT
  USING (
    p_escola_permitida(alunos.escola_id)
    OR (
      (SELECT get_user_role()) = 'PROFESSOR'
      AND EXISTS (
        SELECT 1
        FROM professor_horarios ph
        JOIN professores p ON ph.professor_id = p.id
        WHERE
          ph.turma_id = alunos.turma_id
          AND (
            (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
            OR (p.usuario_id IS NULL AND p.email = (auth.jwt() ->> 'email'))
          )
      )
    )
    OR (
      (SELECT get_user_role()) = 'ALUNO'
      AND (
        (usuario_id IS NOT NULL AND usuario_id = auth.uid())
        OR (id = auth.uid())
        OR (
          cpf IS NOT NULL AND (
            replace(cpf, '.', '') = replace(coalesce(auth.jwt() -> 'user_metadata' ->> 'cpf', ''), '.', '')
            OR (
              auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
              AND replace(cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
            )
          )
        )
      )
    )
  );

-- turmas
DROP POLICY IF EXISTS "auth_select_turmas" ON public.turmas;
CREATE POLICY "auth_select_turmas" ON public.turmas
  FOR SELECT
  USING (p_escola_permitida(turmas.escola_id) OR turmas.escola_id = get_user_escola_id());

-- avaliacoes
DROP POLICY IF EXISTS "auth_select_avaliacoes" ON public.avaliacoes;
CREATE POLICY "auth_select_avaliacoes" ON public.avaliacoes
  FOR SELECT
  USING (
    p_acesso_por_turma(avaliacoes.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = avaliacoes.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- conteudos
DROP POLICY IF EXISTS "auth_select_conteudos" ON public.conteudos;
CREATE POLICY "auth_select_conteudos" ON public.conteudos
  FOR SELECT
  USING (
    p_acesso_por_turma(conteudos.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = conteudos.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- frequencias
DROP POLICY IF EXISTS "auth_select_frequencias" ON public.frequencias;
CREATE POLICY "auth_select_frequencias" ON public.frequencias
  FOR SELECT
  USING (
    p_acesso_por_turma(frequencias.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = frequencias.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- fechamentos_bimestres
DROP POLICY IF EXISTS "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres
  FOR SELECT
  USING (
    p_acesso_por_turma(fechamentos_bimestres.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = fechamentos_bimestres.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- notas
DROP POLICY IF EXISTS "auth_select_notas" ON public.notas;
CREATE POLICY "auth_select_notas" ON public.notas
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR EXISTS (
      SELECT 1
      FROM avaliacoes av JOIN public.turmas t ON av.turma_id = t.id
      WHERE av.id = notas.avaliacao_id AND t.escola_id = get_user_escola_id()
    )
  );

-- professor_alocacoes
DROP POLICY IF EXISTS "auth_select_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "auth_select_professor_alocacoes" ON public.professor_alocacoes
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR professor_alocacoes.escola_id = get_user_escola_id()
  );

-- professor_horarios
DROP POLICY IF EXISTS "auth_select_professor_horarios" ON public.professor_horarios;
CREATE POLICY "auth_select_professor_horarios" ON public.professor_horarios
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR professor_horarios.escola_id = get_user_escola_id()
  );

-- professores
DROP POLICY IF EXISTS "auth_select_professores" ON public.professores;
CREATE POLICY "auth_select_professores" ON public.professores
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR EXISTS (
      SELECT 1 FROM professor_alocacoes pa
      WHERE pa.professor_id = professores.id AND pa.escola_id = get_user_escola_id()
    )
    OR professores.email = (auth.jwt() ->> 'email')
  );
