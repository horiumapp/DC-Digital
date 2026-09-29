-- =============================================================
-- DC Digital -- Correcao de RLS e Constraints
-- Migration: 20260708000001_fix_rls.sql
-- =============================================================

-- ---------------------------------------------------------------
-- 1. CORRIGIR CONSTRAINTS UNIQUE INCORRETAS
-- ---------------------------------------------------------------

-- 1a. notas: UNIQUE (aluno_id) -> UNIQUE (avaliacao_id, aluno_id)
--     Um aluno pode ter notas em multiplas avaliacoes.
ALTER TABLE public.notas
  DROP CONSTRAINT IF EXISTS notas_avaliacao_id_aluno_id_key;
ALTER TABLE public.notas
  ADD CONSTRAINT notas_avaliacao_id_aluno_id_key
  UNIQUE (avaliacao_id, aluno_id);

-- 1b. frequencias: UNIQUE (turma_id) -> UNIQUE (turma_id, aluno_id, data, tempo, disciplina)
--     Cada registro de frequencia e unico por turma+aluno+data+tempo+disciplina.
ALTER TABLE public.frequencias
  DROP CONSTRAINT IF EXISTS frequencias_uniqueness;
ALTER TABLE public.frequencias
  ADD CONSTRAINT frequencias_uniqueness
  UNIQUE (turma_id, aluno_id, data, tempo, disciplina);

-- 1c. professor_alocacoes: UNIQUE (escola_id) -> UNIQUE (professor_id, escola_id, turno)
--     Uma escola pode ter multiplos professores; um professor pode ser alocado em turnos diferentes.
ALTER TABLE public.professor_alocacoes
  DROP CONSTRAINT IF EXISTS professor_alocacoes_professor_id_escola_id_turno_key;
ALTER TABLE public.professor_alocacoes
  ADD CONSTRAINT professor_alocacoes_professor_id_escola_id_turno_key
  UNIQUE (professor_id, escola_id, turno);

-- 1d. professor_horarios: UNIQUE (tempo_ordem) -> UNIQUE (professor_id, dia_semana, tempo_ordem)
--     Um professor nao pode ter dois componentes no mesmo dia e tempo.
ALTER TABLE public.professor_horarios
  DROP CONSTRAINT IF EXISTS professor_horarios_professor_id_dia_semana_tempo_ordem_key;
ALTER TABLE public.professor_horarios
  ADD CONSTRAINT professor_horarios_professor_id_dia_semana_tempo_ordem_key
  UNIQUE (professor_id, dia_semana, tempo_ordem);

-- 1e. fechamentos_bimestres: UNIQUE (bimestre) -> UNIQUE (turma_id, disciplina, bimestre)
--     Cada turma+disciplina tem um fechamento por bimestre.
ALTER TABLE public.fechamentos_bimestres
  DROP CONSTRAINT IF EXISTS unique_fechamento_turma_disciplina_bimestre;
ALTER TABLE public.fechamentos_bimestres
  ADD CONSTRAINT unique_fechamento_turma_disciplina_bimestre
  UNIQUE (turma_id, disciplina, bimestre);

-- 1f. conteudos: UNIQUE (data) -> UNIQUE (turma_id, data, tempo, disciplina)
--     A unicidade de conteudo deve considerar turma, data, tempo e disciplina.
ALTER TABLE public.conteudos
  DROP CONSTRAINT IF EXISTS conteudos_uniqueness;
ALTER TABLE public.conteudos
  ADD CONSTRAINT conteudos_uniqueness
  UNIQUE (turma_id, data, tempo, disciplina);

-- ---------------------------------------------------------------
-- 2. CORRIGIR get_user_role_secure -- adicionar SECURITY DEFINER
--    Sem SECURITY DEFINER a funcao falha ao acessar public.usuarios
--    quando executada por um role sem permissao direta na tabela.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role_secure()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'),
    (SELECT cargo FROM public.usuarios WHERE id = (SELECT auth.uid())),
    'PROFESSOR'
  );
$function$;

-- ---------------------------------------------------------------
-- 3. CORRIGIR admin_whitelist -- ADMIN deve conseguir ler
--    A politica block_all_access bloqueia ate SELECT de ADMIN,
--    quebrando handle_admin_promotion (que usa EXISTS na tabela).
--    Substituimos por politicas granulares.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "block_all_access" ON public.admin_whitelist;

CREATE POLICY "admin_select_whitelist" ON public.admin_whitelist
  FOR SELECT
  USING ((SELECT get_user_role()) = 'ADMIN');

CREATE POLICY "admin_manage_whitelist" ON public.admin_whitelist
  FOR ALL
  USING ((SELECT get_user_role()) = 'ADMIN')
  WITH CHECK ((SELECT get_user_role()) = 'ADMIN');

-- ---------------------------------------------------------------
-- 4. CORRIGIR security_logs -- INSERT deve exigir autenticacao
--    Qualquer usuario anonimo podia inserir logs de seguranca.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_security_logs" ON public.security_logs;
CREATE POLICY "auth_insert_security_logs" ON public.security_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "deny_delete_security_logs" ON public.security_logs;
CREATE POLICY "deny_delete_security_logs" ON public.security_logs
  FOR DELETE
  USING (false);

DROP POLICY IF EXISTS "deny_update_security_logs" ON public.security_logs;
CREATE POLICY "deny_update_security_logs" ON public.security_logs
  FOR UPDATE
  USING (false);

-- ---------------------------------------------------------------
-- 5. CORRIGIR user_consents -- INSERT deve validar user_id
--    Anonimos podiam inserir consentimentos com qualquer user_id.
--    Agora: autenticados inserem apenas para si mesmos;
--    anonimos (user_id IS NULL) sao permitidos para consentimento
--    pre-login (cookie consent), mas nao podem impersonar outros.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert for user_consents" ON public.user_consents;
CREATE POLICY "Allow insert for user_consents" ON public.user_consents
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- ---------------------------------------------------------------
-- 6. CORRIGIR lgpd_requests -- proteger campo status no INSERT
--    O campo status pode ser manipulado pelo usuario na insercao.
--    Forcamos que o status inicial seja sempre 'recebida'.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert for lgpd_requests" ON public.lgpd_requests;
CREATE POLICY "Allow public insert for lgpd_requests" ON public.lgpd_requests
  FOR INSERT
  WITH CHECK (status = 'recebida');

DROP POLICY IF EXISTS "admin_delete_lgpd_requests" ON public.lgpd_requests;
CREATE POLICY "admin_delete_lgpd_requests" ON public.lgpd_requests
  FOR DELETE
  USING ((SELECT get_user_role()) = 'ADMIN');

-- ---------------------------------------------------------------
-- 7. CORRIGIR curriculo_* -- FOR ALL sem WITH CHECK adequado
--    Politicas FOR ALL que usam apenas USING nao protegem INSERT.
--    Recriamos com WITH CHECK explicito.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades;
CREATE POLICY "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text])
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text])
  );

DROP POLICY IF EXISTS "Admin gerencia curriculo_objetos" ON public.curriculo_objetos;
CREATE POLICY "Admin gerencia curriculo_objetos" ON public.curriculo_objetos
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text])
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text])
  );

DROP POLICY IF EXISTS "Admin gerencia curriculo_unidades" ON public.curriculo_unidades;
CREATE POLICY "Admin gerencia curriculo_unidades" ON public.curriculo_unidades
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text])
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text])
  );

-- ---------------------------------------------------------------
-- 8. CORRIGIR usuarios -- Proteger self-update do campo cargo
--    Um usuario na mesma escola poderia alterar o proprio cargo.
--    A policy de UPDATE agora impede auto-promocao de cargo.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "admin_update_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_usuarios" ON public.usuarios
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND escola_id = get_user_escola_id())
    OR id = auth.uid()
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'ADMIN'
    OR (is_admin_or_staff() AND escola_id = get_user_escola_id())
    OR (
      id = auth.uid()
      AND cargo = (SELECT cargo FROM public.usuarios WHERE id = auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- 9. GRANTS -- Garantir que funcoes auxiliares sao acessiveis
-- ---------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_escola_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO authenticated;
