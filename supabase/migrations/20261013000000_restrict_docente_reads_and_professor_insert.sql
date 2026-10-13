-- Leitura docente segue a escola e o papel.
-- Gestor deixa de ver outras escolas. Aluno deixa de ver CPF e contato.
-- Professor vê a própria ficha, a própria lotação e os próprios horários.
-- Avaliações, conteúdos e fechamentos passam a usar só o acesso à turma.
-- O cadastro de professor sai apenas pela RPC, que já confere a escola.

DROP POLICY IF EXISTS "auth_select_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "auth_select_professor_alocacoes" ON public.professor_alocacoes
  FOR SELECT
  TO authenticated
  USING (
    public.p_escola_permitida(professor_alocacoes.escola_id)
    OR public.professor_e_o_proprio(professor_alocacoes.professor_id)
  );

DROP POLICY IF EXISTS "auth_select_professor_horarios" ON public.professor_horarios;
CREATE POLICY "auth_select_professor_horarios" ON public.professor_horarios
  FOR SELECT
  TO authenticated
  USING (
    public.p_escola_permitida(professor_horarios.escola_id)
    OR public.professor_e_o_proprio(professor_horarios.professor_id)
  );

DROP POLICY IF EXISTS "auth_select_professores" ON public.professores;
CREATE POLICY "auth_select_professores" ON public.professores
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (SELECT public.get_user_role()) = 'GESTOR_SEMEC'
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1
        FROM public.professor_alocacoes pa
        WHERE pa.professor_id = professores.id
          AND public.p_escola_permitida(pa.escola_id)
      )
    )
    OR public.professor_e_o_proprio(professores.id)
  );

DROP POLICY IF EXISTS "auth_select_avaliacoes" ON public.avaliacoes;
CREATE POLICY "auth_select_avaliacoes" ON public.avaliacoes
  FOR SELECT
  TO authenticated
  USING (public.p_acesso_por_turma(avaliacoes.turma_id));

DROP POLICY IF EXISTS "auth_select_conteudos" ON public.conteudos;
CREATE POLICY "auth_select_conteudos" ON public.conteudos
  FOR SELECT
  TO authenticated
  USING (public.p_acesso_por_turma(conteudos.turma_id));

DROP POLICY IF EXISTS "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "auth_select_fechamentos" ON public.fechamentos_bimestres
  FOR SELECT
  TO authenticated
  USING (public.p_acesso_por_turma(fechamentos_bimestres.turma_id));

DROP POLICY IF EXISTS "admin_insert_professores" ON public.professores;
DROP POLICY IF EXISTS "semec_insert_professores" ON public.professores;
REVOKE INSERT ON TABLE public.professores FROM PUBLIC, anon, authenticated;
