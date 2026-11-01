-- Hardening: impedir que GESTOR/SECRETARIO demotem cargos superiores via UPDATE.
--
-- Evidência: a política admin_update_usuarios (20261017000000) validava
-- p_cargo_compativel apenas no WITH CHECK (valores novos). O USING aceitava
-- qualquer linha da mesma escola. Um SECRETARIO autenticado podia então
-- alterar cargo de GESTOR/SECRETARIO para PROFESSOR/ALUNO via PostgREST.
--
-- Correção: exigir p_cargo_compativel também sobre o cargo atual (USING),
-- alinhando a mutação ao mesmo escopo da criação de contas.

DROP POLICY IF EXISTS "admin_update_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_usuarios" ON public.usuarios
  FOR UPDATE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND id <> auth.uid()
      AND escola_id = public.get_user_escola_id()
      AND public.p_cargo_compativel(cargo)
    )
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND id <> auth.uid()
      AND escola_id = public.get_user_escola_id()
      AND public.p_cargo_compativel(cargo)
    )
  );
