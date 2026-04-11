-- ==============================================================================
-- 🔒 CORREÇÃO URGENTE — REMOVER POLICIES ANTIGAS QUE PERMITEM ACESSO ANÔNIMO
-- Projeto: BD-DC-DIGITAL (iaeisumzwxhwioufgliu)
--
-- INSTRUÇÕES:
-- 1. Cole no SQL Editor do Supabase
-- 2. Clique em "Run"
--
-- Este script LISTA e depois REMOVE todas as policies antigas que concedem
-- acesso ao role 'public' (que inclui anon/não-autenticado).
-- Em seguida, recria as policies corretas apenas para 'authenticated'.
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PASSO 1: IDENTIFICAR POLICIES PROBLEMÁTICAS               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Primeiro vamos ver TODAS as policies que existem nas tabelas vulneráveis
-- (este SELECT é apenas informativo)

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PASSO 2: REMOVER TODAS AS POLICIES DAS TABELAS AFETADAS   ║
-- ║  (NUCLEAR OPTION - limpa tudo e recria do zero)             ║
-- ╚══════════════════════════════════════════════════════════════╝

-- === ALUNOS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alunos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.alunos', pol.policyname);
    RAISE NOTICE 'Removida policy: % (alunos)', pol.policyname;
  END LOOP;
END $$;

-- === TURMAS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'turmas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.turmas', pol.policyname);
    RAISE NOTICE 'Removida policy: % (turmas)', pol.policyname;
  END LOOP;
END $$;

-- === ESCOLAS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'escolas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.escolas', pol.policyname);
    RAISE NOTICE 'Removida policy: % (escolas)', pol.policyname;
  END LOOP;
END $$;

-- === PROFESSORES: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'professores'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.professores', pol.policyname);
    RAISE NOTICE 'Removida policy: % (professores)', pol.policyname;
  END LOOP;
END $$;

-- === PROFESSOR_HORARIOS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'professor_horarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.professor_horarios', pol.policyname);
    RAISE NOTICE 'Removida policy: % (professor_horarios)', pol.policyname;
  END LOOP;
END $$;

-- === PROFESSOR_ALOCACOES: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'professor_alocacoes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.professor_alocacoes', pol.policyname);
    RAISE NOTICE 'Removida policy: % (professor_alocacoes)', pol.policyname;
  END LOOP;
END $$;

-- === USUARIOS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usuarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios', pol.policyname);
    RAISE NOTICE 'Removida policy: % (usuarios)', pol.policyname;
  END LOOP;
END $$;

-- === FREQUENCIAS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'frequencias'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.frequencias', pol.policyname);
    RAISE NOTICE 'Removida policy: % (frequencias)', pol.policyname;
  END LOOP;
END $$;

-- === CONTEUDOS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conteudos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conteudos', pol.policyname);
    RAISE NOTICE 'Removida policy: % (conteudos)', pol.policyname;
  END LOOP;
END $$;

-- === AVALIACOES: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avaliacoes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.avaliacoes', pol.policyname);
    RAISE NOTICE 'Removida policy: % (avaliacoes)', pol.policyname;
  END LOOP;
END $$;

-- === NOTAS: Remover TODAS as policies ===
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notas', pol.policyname);
    RAISE NOTICE 'Removida policy: % (notas)', pol.policyname;
  END LOOP;
END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PASSO 3: RECRIAR POLICIES CORRETAS (APENAS authenticated) ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Helper functions (recriar para garantir que existem)
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

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('ADMIN', 'GESTOR', 'SECRETARIO');
$$;

-- ── ESCOLAS ──
CREATE POLICY "auth_select_escolas" ON public.escolas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_escolas" ON public.escolas
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_escolas" ON public.escolas
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_escolas" ON public.escolas
  FOR DELETE TO authenticated USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ── TURMAS ──
CREATE POLICY "auth_select_turmas" ON public.turmas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_turmas" ON public.turmas
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_turmas" ON public.turmas
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_turmas" ON public.turmas
  FOR DELETE TO authenticated USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ── PROFESSORES ──
CREATE POLICY "auth_select_professores" ON public.professores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_professores" ON public.professores
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_professores" ON public.professores
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_professores" ON public.professores
  FOR DELETE TO authenticated USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ── ALUNOS ──
CREATE POLICY "auth_select_alunos" ON public.alunos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_alunos" ON public.alunos
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_alunos" ON public.alunos
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_alunos" ON public.alunos
  FOR DELETE TO authenticated USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ── USUARIOS ──
CREATE POLICY "auth_select_usuarios" ON public.usuarios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_usuarios" ON public.usuarios
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_usuarios" ON public.usuarios
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_usuarios" ON public.usuarios
  FOR DELETE TO authenticated USING ((SELECT public.get_user_role()) = 'ADMIN');

-- ── PROFESSOR_HORARIOS ──
CREATE POLICY "auth_select_professor_horarios" ON public.professor_horarios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_professor_horarios" ON public.professor_horarios
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_professor_horarios" ON public.professor_horarios
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_professor_horarios" ON public.professor_horarios
  FOR DELETE TO authenticated USING ((SELECT public.is_admin_or_staff()));

-- ── PROFESSOR_ALOCACOES ──
CREATE POLICY "auth_select_professor_alocacoes" ON public.professor_alocacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_professor_alocacoes" ON public.professor_alocacoes
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_update_professor_alocacoes" ON public.professor_alocacoes
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin_or_staff())) 
  WITH CHECK ((SELECT public.is_admin_or_staff()));
CREATE POLICY "admin_delete_professor_alocacoes" ON public.professor_alocacoes
  FOR DELETE TO authenticated USING ((SELECT public.is_admin_or_staff()));

-- ── FREQUENCIAS (professores lançam) ──
CREATE POLICY "auth_select_frequencias" ON public.frequencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_frequencias" ON public.frequencias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_frequencias" ON public.frequencias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_frequencias" ON public.frequencias
  FOR DELETE TO authenticated USING (true);

-- ── CONTEUDOS (professores lançam) ──
CREATE POLICY "auth_select_conteudos" ON public.conteudos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_conteudos" ON public.conteudos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_conteudos" ON public.conteudos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_conteudos" ON public.conteudos
  FOR DELETE TO authenticated USING (true);

-- ── AVALIACOES (professores lançam) ──
CREATE POLICY "auth_select_avaliacoes" ON public.avaliacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_avaliacoes" ON public.avaliacoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_avaliacoes" ON public.avaliacoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_avaliacoes" ON public.avaliacoes
  FOR DELETE TO authenticated USING (true);

-- ── NOTAS (professores lançam) ──
CREATE POLICY "auth_select_notas" ON public.notas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_notas" ON public.notas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_notas" ON public.notas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_notas" ON public.notas
  FOR DELETE TO authenticated USING (true);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PASSO 4: VERIFICAÇÃO — Listar policies finais             ║
-- ╚══════════════════════════════════════════════════════════════╝

SELECT tablename, policyname, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'alunos', 'turmas', 'escolas', 'professores', 'usuarios',
  'frequencias', 'conteudos', 'avaliacoes', 'notas',
  'professor_horarios', 'professor_alocacoes'
)
ORDER BY tablename, cmd;
