-- Migration: Restringir DELETE na tabela public.professores exclusivamente para ADMIN
-- Impede exclusão cruzada de professores multi-escola por secretários (Achado SEC-02 / Issue 2)

DROP POLICY IF EXISTS "admin_delete_professores" ON public.professores;
CREATE POLICY "admin_delete_professores" ON public.professores
  FOR DELETE
  USING ((get_user_role() = 'ADMIN'::text));
