-- ==============================================================================
-- 🔒 SCRIPT DE CORREÇÃO DE SEGURANÇA — DC DIGITAL
-- Projeto: BD-DC-DIGITAL (iaeisumzwxhwioufgliu)
-- Data: 11/04/2026
-- 
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/iaeisumzwxhwioufgliu/sql
-- 2. Cole este script inteiro no SQL Editor
-- 3. Clique em "Run"
-- 4. Verifique se todas as 10 tabelas mostram "RLS enabled" no Table Editor
--
-- ⚠️ ATENÇÃO: Execute em PRODUÇÃO com cuidado. Este script é IDEMPOTENTE
-- (pode ser executado múltiplas vezes sem efeitos colaterais).
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: HABILITAR ROW LEVEL SECURITY EM TODAS AS TABELAS ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE IF EXISTS public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professor_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professor_alocacoes ENABLE ROW LEVEL SECURITY;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: CRIAR FUNÇÃO HELPER PARA VERIFICAR ROLE          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Função auxiliar que retorna o role do user_metadata do JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt()->'user_metadata'->>'role'),
    'PROFESSOR'
  );
$$;

-- Função helper que verifica se o usuário é ADMIN, GESTOR ou SECRETARIO
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('ADMIN', 'GESTOR', 'SECRETARIO');
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: POLÍTICAS RLS — ESCOLAS                          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Limpeza: remover políticas antigas se existirem
DROP POLICY IF EXISTS "Authenticated can read escolas" ON public.escolas;
DROP POLICY IF EXISTS "Admin staff can insert escolas" ON public.escolas;
DROP POLICY IF EXISTS "Admin staff can update escolas" ON public.escolas;
DROP POLICY IF EXISTS "Admin can delete escolas" ON public.escolas;

-- Qualquer usuário autenticado pode VER escolas
CREATE POLICY "Authenticated can read escolas" ON public.escolas
  FOR SELECT TO authenticated
  USING (true);

-- Apenas ADMIN/GESTOR/SECRETARIO podem CRIAR escolas
CREATE POLICY "Admin staff can insert escolas" ON public.escolas
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()));

-- Apenas ADMIN/GESTOR/SECRETARIO podem ATUALIZAR escolas
CREATE POLICY "Admin staff can update escolas" ON public.escolas
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()))
  WITH CHECK ((SELECT public.is_admin_or_staff()));

-- Apenas ADMIN pode DELETAR escolas
CREATE POLICY "Admin can delete escolas" ON public.escolas
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 4: POLÍTICAS RLS — TURMAS                           ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read turmas" ON public.turmas;
DROP POLICY IF EXISTS "Admin staff can insert turmas" ON public.turmas;
DROP POLICY IF EXISTS "Admin staff can update turmas" ON public.turmas;
DROP POLICY IF EXISTS "Admin can delete turmas" ON public.turmas;

CREATE POLICY "Authenticated can read turmas" ON public.turmas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin staff can insert turmas" ON public.turmas
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can update turmas" ON public.turmas
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()))
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin can delete turmas" ON public.turmas
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 5: POLÍTICAS RLS — PROFESSORES                      ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read professores" ON public.professores;
DROP POLICY IF EXISTS "Admin staff can insert professores" ON public.professores;
DROP POLICY IF EXISTS "Admin staff can update professores" ON public.professores;
DROP POLICY IF EXISTS "Admin can delete professores" ON public.professores;

CREATE POLICY "Authenticated can read professores" ON public.professores
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin staff can insert professores" ON public.professores
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can update professores" ON public.professores
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()))
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin can delete professores" ON public.professores
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 6: POLÍTICAS RLS — ALUNOS                           ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin staff can insert alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin staff can update alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin can delete alunos" ON public.alunos;

CREATE POLICY "Authenticated can read alunos" ON public.alunos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin staff can insert alunos" ON public.alunos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can update alunos" ON public.alunos
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()))
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin can delete alunos" ON public.alunos
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 7: POLÍTICAS RLS — PROFESSOR_HORARIOS               ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read professor_horarios" ON public.professor_horarios;
DROP POLICY IF EXISTS "Admin staff can insert professor_horarios" ON public.professor_horarios;
DROP POLICY IF EXISTS "Admin staff can update professor_horarios" ON public.professor_horarios;
DROP POLICY IF EXISTS "Admin staff can delete professor_horarios" ON public.professor_horarios;

CREATE POLICY "Authenticated can read professor_horarios" ON public.professor_horarios
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin staff can insert professor_horarios" ON public.professor_horarios
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can update professor_horarios" ON public.professor_horarios
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()))
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can delete professor_horarios" ON public.professor_horarios
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_or_staff()));

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 8: POLÍTICAS RLS — PROFESSOR_ALOCACOES              ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read professor_alocacoes" ON public.professor_alocacoes;
DROP POLICY IF EXISTS "Admin staff can insert professor_alocacoes" ON public.professor_alocacoes;
DROP POLICY IF EXISTS "Admin staff can update professor_alocacoes" ON public.professor_alocacoes;
DROP POLICY IF EXISTS "Admin staff can delete professor_alocacoes" ON public.professor_alocacoes;

CREATE POLICY "Authenticated can read professor_alocacoes" ON public.professor_alocacoes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin staff can insert professor_alocacoes" ON public.professor_alocacoes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can update professor_alocacoes" ON public.professor_alocacoes
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()))
  WITH CHECK ((SELECT public.is_admin_or_staff()));

CREATE POLICY "Admin staff can delete professor_alocacoes" ON public.professor_alocacoes
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_or_staff()));

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 9: POLÍTICAS RLS — FREQUENCIAS                      ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read frequencias" ON public.frequencias;
DROP POLICY IF EXISTS "Authenticated can insert frequencias" ON public.frequencias;
DROP POLICY IF EXISTS "Authenticated can update frequencias" ON public.frequencias;
DROP POLICY IF EXISTS "Authenticated can delete frequencias" ON public.frequencias;

-- Qualquer usuário autenticado pode gerenciar frequências (professores lançam)
CREATE POLICY "Authenticated can read frequencias" ON public.frequencias
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert frequencias" ON public.frequencias
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update frequencias" ON public.frequencias
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete frequencias" ON public.frequencias
  FOR DELETE TO authenticated
  USING (true);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 10: POLÍTICAS RLS — CONTEUDOS                       ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read conteudos" ON public.conteudos;
DROP POLICY IF EXISTS "Authenticated can insert conteudos" ON public.conteudos;
DROP POLICY IF EXISTS "Authenticated can update conteudos" ON public.conteudos;
DROP POLICY IF EXISTS "Authenticated can delete conteudos" ON public.conteudos;

CREATE POLICY "Authenticated can read conteudos" ON public.conteudos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert conteudos" ON public.conteudos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update conteudos" ON public.conteudos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete conteudos" ON public.conteudos
  FOR DELETE TO authenticated
  USING (true);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 11: POLÍTICAS RLS — AVALIACOES                      ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Authenticated can insert avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Authenticated can update avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Authenticated can delete avaliacoes" ON public.avaliacoes;

CREATE POLICY "Authenticated can read avaliacoes" ON public.avaliacoes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert avaliacoes" ON public.avaliacoes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update avaliacoes" ON public.avaliacoes
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete avaliacoes" ON public.avaliacoes
  FOR DELETE TO authenticated
  USING (true);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 12: POLÍTICAS RLS — NOTAS                           ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "Authenticated can read notas" ON public.notas;
DROP POLICY IF EXISTS "Authenticated can insert notas" ON public.notas;
DROP POLICY IF EXISTS "Authenticated can update notas" ON public.notas;
DROP POLICY IF EXISTS "Authenticated can delete notas" ON public.notas;

CREATE POLICY "Authenticated can read notas" ON public.notas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert notas" ON public.notas
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update notas" ON public.notas
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete notas" ON public.notas
  FOR DELETE TO authenticated
  USING (true);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 13: TRIGGER — PROMOÇÃO AUTOMÁTICA DE ADMIN          ║
-- ║  (Substitui a lógica hardcoded do frontend)                ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Este trigger verifica o e-mail do novo usuário e, se for um admin conhecido,
-- atualiza o user_metadata com role = 'ADMIN'.
-- A lógica agora vive no SERVIDOR, não no código público do frontend.

CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_emails text[] := ARRAY['prof.jackison@gmail.com', 'jackison1985@hotmail.com'];
  current_role text;
BEGIN
  -- Se o e-mail do novo usuário está na lista de admins
  IF NEW.email = ANY(admin_emails) THEN
    current_role := COALESCE(NEW.raw_user_meta_data->>'role', 'PROFESSOR');
    
    -- Promover para ADMIN se ainda não for
    IF current_role != 'ADMIN' THEN
      NEW.raw_user_meta_data := NEW.raw_user_meta_data || '{"role": "ADMIN"}'::jsonb;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_admin_promotion ON auth.users;

-- Criar trigger que roda ANTES de inserir ou atualizar um usuário
CREATE TRIGGER on_auth_user_admin_promotion
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_promotion();

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PARTE 14: VERIFICAÇÃO FINAL                               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Listar status de RLS de todas as tabelas (deve mostrar TRUE para todas)
SELECT 
  c.relname AS tabela,
  c.relrowsecurity AS rls_habilitado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN (
    'alunos', 'turmas', 'escolas', 'professores', 
    'frequencias', 'conteudos', 'avaliacoes', 'notas',
    'professor_horarios', 'professor_alocacoes'
  )
ORDER BY c.relname;
