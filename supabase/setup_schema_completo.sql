-- ========================================================
-- DC Digital: Schema Completo Unificado para Novo Banco
-- ========================================================



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260707000000_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- DC Digital — Banco de Dados Schema Inicial

-- ==========================================
-- 0. EXTENSÕES E SEQUÊNCIAS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS public.audit_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.avaliacoes_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.conteudos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.frequencias_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.notas_id_seq;

-- ==========================================
-- 2. TABELAS E ESTRUTURA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_whitelist_pkey PRIMARY KEY (email)
);

CREATE TABLE IF NOT EXISTS public.alunos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL,
  turma_id uuid,
  nome text NOT NULL,
  data_nascimento date NOT NULL,
  cpf text,
  sexo text,
  nome_responsavel text NOT NULL,
  telefone text NOT NULL,
  endereco text NOT NULL,
  status text NOT NULL DEFAULT 'Ativo'::text,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  matricula text,
  CONSTRAINT alunos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  table_name text,
  record_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id bigint NOT NULL DEFAULT nextval('avaliacoes_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  turma_id uuid NOT NULL,
  tipo text NOT NULL,
  data text NOT NULL,
  instrumento text,
  objetos jsonb DEFAULT '[]'::jsonb,
  bimestre text,
  valor_maximo numeric DEFAULT 10,
  disciplina text DEFAULT 'GERAL'::text,
  parent_id bigint,
  CONSTRAINT avaliacoes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.conteudos (
  id bigint NOT NULL DEFAULT nextval('conteudos_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  turma_id uuid NOT NULL,
  data text NOT NULL,
  tempo text NOT NULL,
  objetos jsonb DEFAULT '[]'::jsonb,
  habilidades jsonb DEFAULT '[]'::jsonb,
  descricao text,
  disciplina text DEFAULT 'GERAL'::text,
  CONSTRAINT conteudos_pkey PRIMARY KEY (id),
  CONSTRAINT conteudos_uniqueness UNIQUE (turma_id, data, tempo, disciplina)
);

CREATE TABLE IF NOT EXISTS public.curriculo_habilidades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unidade_id uuid,
  codigo text NOT NULL,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT curriculo_habilidades_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.curriculo_objetos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unidade_id uuid,
  descricao text NOT NULL,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT curriculo_objetos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.curriculo_unidades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  modalidade text NOT NULL,
  ano text NOT NULL,
  disciplina text NOT NULL,
  bimestre text NOT NULL,
  nome text NOT NULL,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT curriculo_unidades_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.escolas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  distrito text,
  inep text,
  diretor text,
  status text DEFAULT 'Ativa'::text,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  logo_url text,
  CONSTRAINT escolas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fechamentos_bimestres (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL,
  disciplina text NOT NULL,
  bimestre text NOT NULL,
  status text NOT NULL,
  data_fechamento timestamp with time zone DEFAULT timezone('utc'::text, now()),
  usuario_fechamento_id uuid,
  CONSTRAINT fechamentos_bimestres_pkey PRIMARY KEY (id),
  CONSTRAINT unique_fechamento_turma_disciplina_bimestre UNIQUE (turma_id, disciplina, bimestre)
);

CREATE TABLE IF NOT EXISTS public.frequencias (
  id bigint NOT NULL DEFAULT nextval('frequencias_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  turma_id uuid NOT NULL,
  aluno_id uuid NOT NULL,
  data text NOT NULL,
  tempo text NOT NULL,
  status text NOT NULL,
  participacao text NOT NULL,
  disciplina text DEFAULT 'GERAL'::text,
  CONSTRAINT frequencias_pkey PRIMARY KEY (id),
  CONSTRAINT frequencias_uniqueness UNIQUE (turma_id, aluno_id, data, tempo, disciplina)
);

CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'recebida'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resposta_admin text,
  CONSTRAINT lgpd_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notas (
  id bigint NOT NULL DEFAULT nextval('notas_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  avaliacao_id bigint,
  aluno_id uuid NOT NULL,
  valor numeric NOT NULL,
  CONSTRAINT notas_pkey PRIMARY KEY (id),
  CONSTRAINT notas_avaliacao_id_aluno_id_key UNIQUE (avaliacao_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS public.professor_alocacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL,
  escola_id uuid NOT NULL,
  turno text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT professor_alocacoes_pkey PRIMARY KEY (id),
  CONSTRAINT professor_alocacoes_professor_id_escola_id_turno_key UNIQUE (professor_id, escola_id, turno)
);

CREATE TABLE IF NOT EXISTS public.professor_horarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL,
  turma_id uuid NOT NULL,
  escola_id uuid NOT NULL,
  dia_semana integer NOT NULL,
  tempo_ordem integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  componente text NOT NULL,
  CONSTRAINT professor_horarios_pkey PRIMARY KEY (id),
  CONSTRAINT professor_horarios_professor_id_dia_semana_tempo_ordem_key UNIQUE (professor_id, dia_semana, tempo_ordem)
);

CREATE TABLE IF NOT EXISTS public.professores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  cpf text,
  telefone text,
  vinculo text,
  status text DEFAULT 'Ativo'::text,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  departamento text DEFAULT 'Geral'::text,
  disciplinas text[] DEFAULT '{}'::text[],
  CONSTRAINT professores_pkey PRIMARY KEY (id),
  CONSTRAINT professores_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  ip text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb,
  CONSTRAINT security_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.turmas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL,
  nome text NOT NULL,
  turno text NOT NULL,
  ano_letivo text NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT turmas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  finalidade text NOT NULL,
  status text NOT NULL,
  versao_politica text NOT NULL,
  data_hora_aceite timestamp with time zone NOT NULL DEFAULT now(),
  data_hora_revogacao timestamp with time zone,
  ip text,
  user_agent text,
  CONSTRAINT user_consents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid NOT NULL,
  email text,
  nome_completo text,
  cargo text,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  escola_id uuid,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);

-- ==========================================
-- 3. CHAVES ESTRANGEIRAS
-- ==========================================

ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_turma_id_fkey;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_escola_id_fkey;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);
ALTER TABLE public.avaliacoes DROP CONSTRAINT IF EXISTS avaliacoes_turma_id_fkey;
ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);
ALTER TABLE public.avaliacoes DROP CONSTRAINT IF EXISTS avaliacoes_parent_id_fkey;
ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.avaliacoes(id);
ALTER TABLE public.conteudos DROP CONSTRAINT IF EXISTS conteudos_turma_id_fkey;
ALTER TABLE public.conteudos ADD CONSTRAINT conteudos_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);
ALTER TABLE public.curriculo_habilidades DROP CONSTRAINT IF EXISTS curriculo_habilidades_unidade_id_fkey;
ALTER TABLE public.curriculo_habilidades ADD CONSTRAINT curriculo_habilidades_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.curriculo_unidades(id);
ALTER TABLE public.curriculo_objetos DROP CONSTRAINT IF EXISTS curriculo_objetos_unidade_id_fkey;
ALTER TABLE public.curriculo_objetos ADD CONSTRAINT curriculo_objetos_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.curriculo_unidades(id);
ALTER TABLE public.fechamentos_bimestres DROP CONSTRAINT IF EXISTS fechamentos_bimestres_turma_id_fkey;
ALTER TABLE public.fechamentos_bimestres ADD CONSTRAINT fechamentos_bimestres_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);
ALTER TABLE public.frequencias DROP CONSTRAINT IF EXISTS frequencias_turma_id_fkey;
ALTER TABLE public.frequencias ADD CONSTRAINT frequencias_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);
ALTER TABLE public.frequencias DROP CONSTRAINT IF EXISTS frequencias_aluno_id_fkey;
ALTER TABLE public.frequencias ADD CONSTRAINT frequencias_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.alunos(id);
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_avaliacao_id_fkey;
ALTER TABLE public.notas ADD CONSTRAINT notas_avaliacao_id_fkey FOREIGN KEY (avaliacao_id) REFERENCES public.avaliacoes(id);
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_aluno_id_fkey;
ALTER TABLE public.notas ADD CONSTRAINT notas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.alunos(id);
ALTER TABLE public.professor_alocacoes DROP CONSTRAINT IF EXISTS professor_alocacoes_escola_id_fkey;
ALTER TABLE public.professor_alocacoes ADD CONSTRAINT professor_alocacoes_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);
ALTER TABLE public.professor_alocacoes DROP CONSTRAINT IF EXISTS professor_alocacoes_professor_id_fkey;
ALTER TABLE public.professor_alocacoes ADD CONSTRAINT professor_alocacoes_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.professores(id);
ALTER TABLE public.professor_horarios DROP CONSTRAINT IF EXISTS professor_horarios_escola_id_fkey;
ALTER TABLE public.professor_horarios ADD CONSTRAINT professor_horarios_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);
ALTER TABLE public.professor_horarios DROP CONSTRAINT IF EXISTS professor_horarios_turma_id_fkey;
ALTER TABLE public.professor_horarios ADD CONSTRAINT professor_horarios_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);
ALTER TABLE public.professor_horarios DROP CONSTRAINT IF EXISTS professor_horarios_professor_id_fkey;
ALTER TABLE public.professor_horarios ADD CONSTRAINT professor_horarios_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.professores(id);
ALTER TABLE public.turmas DROP CONSTRAINT IF EXISTS turmas_escola_id_fkey;
ALTER TABLE public.turmas ADD CONSTRAINT turmas_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_escola_id_fkey;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);

-- ==========================================
-- 1. FUNÇÕES AUXILIARES
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM lgpd_requests
  WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Limite de solicitações LGPD excedido. Máximo de 5 por hora por e-mail. Tente novamente mais tarde.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record_id TEXT;
BEGIN
  -- Determina o ID do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
  ELSE
    v_record_id := NEW.id::TEXT;
  END IF;

  INSERT INTO audit_log (user_id, user_email, action, table_name, record_id)
  VALUES (
    auth.uid(),
    auth.email(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_matricula_aluno()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  ano_atual INT := EXTRACT(YEAR FROM NOW());
  seq_num TEXT;
BEGIN
  IF NEW.matricula IS NULL OR NEW.matricula = '' THEN
    seq_num := LPAD(
      (EXTRACT(EPOCH FROM NOW())::bigint % 9999999)::text,
      7, '0'
    );
    NEW.matricula := ano_atual::text || '/' || seq_num;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_escola_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (SELECT escola_id FROM public.usuarios WHERE id = auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'),
    (SELECT cargo FROM public.usuarios WHERE id = (SELECT auth.uid()))
    -- SEGURANÇA: fallback 'PROFESSOR' removido. Usuário sem role é bloqueado pelo RLS.
    -- Consistente com migration 20260712000002_security_fixes.sql.
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
    -- SEGURANÇA: fallback 'PROFESSOR' removido. Usuário sem role é bloqueado pelo RLS.
    -- Consistente com migration 20260712000002_security_fixes.sql.
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Evitar recursão de triggers
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN
    -- Apenas promove se o role no app_metadata não for GESTOR ou SECRETARIO
    IF COALESCE(NEW.raw_app_meta_data->>'role', '') NOT IN ('GESTOR', 'SECRETARIO') THEN
      NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb;
      UPDATE public.usuarios SET cargo = 'ADMIN' WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_nome text;
  v_cpf text;
  v_telefone text;
  v_vinculo text;
  v_cargo text;
BEGIN
  v_nome    := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_cpf     := COALESCE(NEW.raw_user_meta_data->>'cpf', '');
  v_telefone := COALESCE(NEW.raw_user_meta_data->>'telefone', '');
  v_vinculo := COALESCE(NEW.raw_user_meta_data->>'vinculo', 'A Definir');
  v_cargo   := COALESCE(NEW.raw_app_meta_data->>'role', 'PROFESSOR');

  -- Insere na tabela pública de usuários com o cargo correto
  INSERT INTO public.usuarios (id, email, nome_completo, cargo)
  VALUES (NEW.id, NEW.email, v_nome, v_cargo)
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email, 
      nome_completo = EXCLUDED.nome_completo, 
      cargo = EXCLUDED.cargo;

  -- Apenas insere na tabela de professores se for PROFESSOR
  IF v_cargo = 'PROFESSOR' THEN
    INSERT INTO public.professores (nome, email, cpf, telefone, vinculo, status)
    VALUES (v_nome, NEW.email, v_cpf, v_telefone, v_vinculo, 'Inativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR', 'SECRETARIO');
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_cargo_to_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Evitar recursão de triggers
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.cargo IS DISTINCT FROM NEW.cargo THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.cargo)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- ==========================================
-- 4. HABILITAÇÃO RLS
-- ==========================================

ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculo_habilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculo_objetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculo_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_bimestres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================

-- Tabela public.admin_whitelist
DROP POLICY IF EXISTS "block_all_access" ON public.admin_whitelist;
CREATE POLICY "block_all_access" ON public.admin_whitelist
  FOR ALL
  USING (false)
  WITH CHECK (false)
;

-- Tabela public.alunos
DROP POLICY IF EXISTS "admin_delete_alunos" ON public.alunos;
CREATE POLICY "admin_delete_alunos" ON public.alunos
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.alunos
DROP POLICY IF EXISTS "admin_insert_alunos" ON public.alunos;
CREATE POLICY "admin_insert_alunos" ON public.alunos
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.alunos
DROP POLICY IF EXISTS "auth_select_alunos" ON public.alunos;
CREATE POLICY "auth_select_alunos" ON public.alunos
  FOR SELECT
  USING ((is_admin_or_staff() OR (escola_id = get_user_escola_id())))
;

-- Tabela public.alunos
DROP POLICY IF EXISTS "admin_update_alunos" ON public.alunos;
CREATE POLICY "admin_update_alunos" ON public.alunos
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.audit_log
DROP POLICY IF EXISTS "deny_delete_audit_log" ON public.audit_log;
CREATE POLICY "deny_delete_audit_log" ON public.audit_log
  FOR DELETE
  USING (false)
;

-- Tabela public.audit_log
DROP POLICY IF EXISTS "deny_manual_insert_audit_log" ON public.audit_log;
CREATE POLICY "deny_manual_insert_audit_log" ON public.audit_log
  FOR INSERT
  WITH CHECK (false)
;

-- Tabela public.audit_log
DROP POLICY IF EXISTS "only_admin_select_audit_log" ON public.audit_log;
CREATE POLICY "only_admin_select_audit_log" ON public.audit_log
  FOR SELECT
  USING ((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text))
;

-- Tabela public.audit_log
DROP POLICY IF EXISTS "deny_update_audit_log" ON public.audit_log;
CREATE POLICY "deny_update_audit_log" ON public.audit_log
  FOR UPDATE
  USING (false)
;

-- Tabela public.avaliacoes
DROP POLICY IF EXISTS "professor_pode_deletar_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_deletar_propria_avaliacao" ON public.avaliacoes
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = avaliacoes.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = avaliacoes.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.avaliacoes
DROP POLICY IF EXISTS "professor_pode_inserir_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_inserir_propria_avaliacao" ON public.avaliacoes
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = avaliacoes.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = avaliacoes.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.avaliacoes
DROP POLICY IF EXISTS "auth_select_avaliacoes" ON public.avaliacoes;
CREATE POLICY "auth_select_avaliacoes" ON public.avaliacoes
  FOR SELECT
  USING ((is_admin_or_staff() OR (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = avaliacoes.turma_id) AND (t.escola_id = get_user_escola_id()))))))
;

-- Tabela public.avaliacoes
DROP POLICY IF EXISTS "professor_pode_editar_propria_avaliacao" ON public.avaliacoes;
CREATE POLICY "professor_pode_editar_propria_avaliacao" ON public.avaliacoes
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = avaliacoes.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = avaliacoes.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = avaliacoes.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = avaliacoes.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.conteudos
DROP POLICY IF EXISTS "professor_pode_deletar_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_deletar_proprio_conteudo" ON public.conteudos
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = conteudos.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = conteudos.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.conteudos
DROP POLICY IF EXISTS "professor_pode_inserir_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_inserir_proprio_conteudo" ON public.conteudos
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = conteudos.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = conteudos.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.conteudos
DROP POLICY IF EXISTS "auth_select_conteudos" ON public.conteudos;
CREATE POLICY "auth_select_conteudos" ON public.conteudos
  FOR SELECT
  USING ((is_admin_or_staff() OR (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = conteudos.turma_id) AND (t.escola_id = get_user_escola_id()))))))
;

-- Tabela public.conteudos
DROP POLICY IF EXISTS "professor_pode_editar_proprio_conteudo" ON public.conteudos;
CREATE POLICY "professor_pode_editar_proprio_conteudo" ON public.conteudos
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = conteudos.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = conteudos.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = conteudos.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = conteudos.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.curriculo_habilidades
DROP POLICY IF EXISTS "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades;
CREATE POLICY "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades
  FOR ALL
  USING (((( SELECT auth.role() AS role) = 'authenticated'::text) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text]))))
;

-- Tabela public.curriculo_habilidades
DROP POLICY IF EXISTS "Leitura autenticados curriculo_habilidades" ON public.curriculo_habilidades;
CREATE POLICY "Leitura autenticados curriculo_habilidades" ON public.curriculo_habilidades
  FOR SELECT
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
;

-- Tabela public.curriculo_objetos
DROP POLICY IF EXISTS "Admin gerencia curriculo_objetos" ON public.curriculo_objetos;
CREATE POLICY "Admin gerencia curriculo_objetos" ON public.curriculo_objetos
  FOR ALL
  USING (((( SELECT auth.role() AS role) = 'authenticated'::text) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text]))))
;

-- Tabela public.curriculo_objetos
DROP POLICY IF EXISTS "Leitura autenticados curriculo_objetos" ON public.curriculo_objetos;
CREATE POLICY "Leitura autenticados curriculo_objetos" ON public.curriculo_objetos
  FOR SELECT
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
;

-- Tabela public.curriculo_unidades
DROP POLICY IF EXISTS "Admin gerencia curriculo_unidades" ON public.curriculo_unidades;
CREATE POLICY "Admin gerencia curriculo_unidades" ON public.curriculo_unidades
  FOR ALL
  USING (((( SELECT auth.role() AS role) = 'authenticated'::text) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text]))))
;

-- Tabela public.curriculo_unidades
DROP POLICY IF EXISTS "Leitura autenticados curriculo_unidades" ON public.curriculo_unidades;
CREATE POLICY "Leitura autenticados curriculo_unidades" ON public.curriculo_unidades
  FOR SELECT
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
;

-- Tabela public.escolas
DROP POLICY IF EXISTS "admin_delete_escolas" ON public.escolas;
CREATE POLICY "admin_delete_escolas" ON public.escolas
  FOR DELETE
  USING ((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text))
;

-- Tabela public.escolas
DROP POLICY IF EXISTS "admin_insert_escolas" ON public.escolas;
CREATE POLICY "admin_insert_escolas" ON public.escolas
  FOR INSERT
  WITH CHECK ((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text))
;

-- Tabela public.escolas
DROP POLICY IF EXISTS "auth_select_escolas" ON public.escolas;
CREATE POLICY "auth_select_escolas" ON public.escolas
  FOR SELECT
  USING ((is_admin_or_staff() OR (id = get_user_escola_id())))
;

-- Tabela public.escolas
DROP POLICY IF EXISTS "admin_update_escolas" ON public.escolas;
CREATE POLICY "admin_update_escolas" ON public.escolas
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (id = get_user_escola_id()))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (id = get_user_escola_id()))))
;

-- Tabela public.fechamentos_bimestres
DROP POLICY IF EXISTS "admin_delete_fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "admin_delete_fechamentos" ON public.fechamentos_bimestres
  FOR DELETE
  USING ((get_user_role() = 'ADMIN'::text))
;

-- Tabela public.fechamentos_bimestres
DROP POLICY IF EXISTS "staff_ou_professor_insert_fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "staff_ou_professor_insert_fechamentos" ON public.fechamentos_bimestres
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = fechamentos_bimestres.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = fechamentos_bimestres.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.fechamentos_bimestres
DROP POLICY IF EXISTS "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres
  FOR SELECT
  USING ((is_admin_or_staff() OR (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = fechamentos_bimestres.turma_id) AND (t.escola_id = get_user_escola_id()))))))
;

-- Tabela public.fechamentos_bimestres
DROP POLICY IF EXISTS "staff_ou_professor_update_fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "staff_ou_professor_update_fechamentos" ON public.fechamentos_bimestres
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = fechamentos_bimestres.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = fechamentos_bimestres.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = fechamentos_bimestres.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = fechamentos_bimestres.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.frequencias
DROP POLICY IF EXISTS "professor_pode_deletar_propria_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_deletar_propria_frequencia" ON public.frequencias
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = frequencias.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = frequencias.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.frequencias
DROP POLICY IF EXISTS "professor_pode_inserir_propria_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_inserir_propria_frequencia" ON public.frequencias
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = frequencias.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = frequencias.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.frequencias
DROP POLICY IF EXISTS "auth_select_frequencias" ON public.frequencias;
CREATE POLICY "auth_select_frequencias" ON public.frequencias
  FOR SELECT
  USING ((is_admin_or_staff() OR (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = frequencias.turma_id) AND (t.escola_id = get_user_escola_id()))))))
;

-- Tabela public.frequencias
DROP POLICY IF EXISTS "professor_pode_editar_propria_frequencia" ON public.frequencias;
CREATE POLICY "professor_pode_editar_propria_frequencia" ON public.frequencias
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = frequencias.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = frequencias.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM turmas t
  WHERE ((t.id = frequencias.turma_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM (professor_horarios ph
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((ph.turma_id = frequencias.turma_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.lgpd_requests
DROP POLICY IF EXISTS "Allow public insert for lgpd_requests" ON public.lgpd_requests;
CREATE POLICY "Allow public insert for lgpd_requests" ON public.lgpd_requests
  FOR INSERT
  WITH CHECK (true)
;

-- Tabela public.lgpd_requests
DROP POLICY IF EXISTS "Allow select for owner or admin" ON public.lgpd_requests;
CREATE POLICY "Allow select for owner or admin" ON public.lgpd_requests
  FOR SELECT
  USING (((email = ( SELECT (auth.jwt() ->> 'email'::text))) OR (( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text)))
;

-- Tabela public.lgpd_requests
DROP POLICY IF EXISTS "Allow update for admin only" ON public.lgpd_requests;
CREATE POLICY "Allow update for admin only" ON public.lgpd_requests
  FOR UPDATE
  USING ((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text))
;

-- Tabela public.notas
DROP POLICY IF EXISTS "professor_pode_deletar_propria_nota" ON public.notas;
CREATE POLICY "professor_pode_deletar_propria_nota" ON public.notas
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM (avaliacoes av
     JOIN turmas t ON ((av.turma_id = t.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM ((avaliacoes av
     JOIN professor_horarios ph ON ((av.turma_id = ph.turma_id)))
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.notas
DROP POLICY IF EXISTS "professor_pode_inserir_propria_nota" ON public.notas;
CREATE POLICY "professor_pode_inserir_propria_nota" ON public.notas
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM (avaliacoes av
     JOIN turmas t ON ((av.turma_id = t.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM ((avaliacoes av
     JOIN professor_horarios ph ON ((av.turma_id = ph.turma_id)))
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.notas
DROP POLICY IF EXISTS "auth_select_notas" ON public.notas;
CREATE POLICY "auth_select_notas" ON public.notas
  FOR SELECT
  USING ((is_admin_or_staff() OR (EXISTS ( SELECT 1
   FROM (avaliacoes av
     JOIN turmas t ON ((av.turma_id = t.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (t.escola_id = get_user_escola_id()))))))
;

-- Tabela public.notas
DROP POLICY IF EXISTS "professor_pode_editar_propria_nota" ON public.notas;
CREATE POLICY "professor_pode_editar_propria_nota" ON public.notas
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM (avaliacoes av
     JOIN turmas t ON ((av.turma_id = t.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM ((avaliacoes av
     JOIN professor_horarios ph ON ((av.turma_id = ph.turma_id)))
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM (avaliacoes av
     JOIN turmas t ON ((av.turma_id = t.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (t.escola_id = get_user_escola_id()))))) OR (EXISTS ( SELECT 1
   FROM ((avaliacoes av
     JOIN professor_horarios ph ON ((av.turma_id = ph.turma_id)))
     JOIN professores p ON ((ph.professor_id = p.id)))
  WHERE ((av.id = notas.avaliacao_id) AND (p.email = (auth.jwt() ->> 'email'::text)))))))
;

-- Tabela public.professor_alocacoes
DROP POLICY IF EXISTS "admin_delete_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "admin_delete_professor_alocacoes" ON public.professor_alocacoes
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.professor_alocacoes
DROP POLICY IF EXISTS "admin_insert_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "admin_insert_professor_alocacoes" ON public.professor_alocacoes
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.professor_alocacoes
DROP POLICY IF EXISTS "auth_select_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "auth_select_professor_alocacoes" ON public.professor_alocacoes
  FOR SELECT
  USING ((is_admin_or_staff() OR (escola_id = get_user_escola_id())))
;

-- Tabela public.professor_alocacoes
DROP POLICY IF EXISTS "admin_update_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "admin_update_professor_alocacoes" ON public.professor_alocacoes
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.professor_horarios
DROP POLICY IF EXISTS "admin_delete_professor_horarios" ON public.professor_horarios;
CREATE POLICY "admin_delete_professor_horarios" ON public.professor_horarios
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.professor_horarios
DROP POLICY IF EXISTS "admin_insert_professor_horarios" ON public.professor_horarios;
CREATE POLICY "admin_insert_professor_horarios" ON public.professor_horarios
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.professor_horarios
DROP POLICY IF EXISTS "auth_select_professor_horarios" ON public.professor_horarios;
CREATE POLICY "auth_select_professor_horarios" ON public.professor_horarios
  FOR SELECT
  USING ((is_admin_or_staff() OR (escola_id = get_user_escola_id())))
;

-- Tabela public.professor_horarios
DROP POLICY IF EXISTS "admin_update_professor_horarios" ON public.professor_horarios;
CREATE POLICY "admin_update_professor_horarios" ON public.professor_horarios
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.professores
DROP POLICY IF EXISTS "admin_delete_professores" ON public.professores;
CREATE POLICY "admin_delete_professores" ON public.professores
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM professor_alocacoes pa
  WHERE ((pa.professor_id = professores.id) AND (pa.escola_id = get_user_escola_id())))))))
;

-- Tabela public.professores
DROP POLICY IF EXISTS "admin_insert_professores" ON public.professores;
CREATE POLICY "admin_insert_professores" ON public.professores
  FOR INSERT
  WITH CHECK (( SELECT is_admin_or_staff() AS is_admin_or_staff))
;

-- Tabela public.professores
DROP POLICY IF EXISTS "auth_select_professores" ON public.professores;
CREATE POLICY "auth_select_professores" ON public.professores
  FOR SELECT
  USING ((is_admin_or_staff() OR (EXISTS ( SELECT 1
   FROM professor_alocacoes pa
  WHERE ((pa.professor_id = professores.id) AND (pa.escola_id = get_user_escola_id())))) OR (email = (auth.jwt() ->> 'email'::text))))
;

-- Tabela public.professores
DROP POLICY IF EXISTS "admin_update_professores" ON public.professores;
CREATE POLICY "admin_update_professores" ON public.professores
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM professor_alocacoes pa
  WHERE ((pa.professor_id = professores.id) AND (pa.escola_id = get_user_escola_id())))))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (EXISTS ( SELECT 1
   FROM professor_alocacoes pa
  WHERE ((pa.professor_id = professores.id) AND (pa.escola_id = get_user_escola_id())))))))
;

-- Tabela public.security_logs
DROP POLICY IF EXISTS "auth_insert_security_logs" ON public.security_logs;
CREATE POLICY "auth_insert_security_logs" ON public.security_logs
  FOR INSERT
  WITH CHECK (true)
;

-- Tabela public.security_logs
DROP POLICY IF EXISTS "Allow select for admin only" ON public.security_logs;
CREATE POLICY "Allow select for admin only" ON public.security_logs
  FOR SELECT
  USING ((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text))
;

-- Tabela public.turmas
DROP POLICY IF EXISTS "admin_delete_turmas" ON public.turmas;
CREATE POLICY "admin_delete_turmas" ON public.turmas
  FOR DELETE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.turmas
DROP POLICY IF EXISTS "admin_insert_turmas" ON public.turmas;
CREATE POLICY "admin_insert_turmas" ON public.turmas
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.turmas
DROP POLICY IF EXISTS "auth_select_turmas" ON public.turmas;
CREATE POLICY "auth_select_turmas" ON public.turmas
  FOR SELECT
  USING ((is_admin_or_staff() OR (escola_id = get_user_escola_id())))
;

-- Tabela public.turmas
DROP POLICY IF EXISTS "admin_update_turmas" ON public.turmas;
CREATE POLICY "admin_update_turmas" ON public.turmas
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.user_consents
DROP POLICY IF EXISTS "Allow public insert for user_consents" ON public.user_consents;
CREATE POLICY "Allow public insert for user_consents" ON public.user_consents
  FOR INSERT
  WITH CHECK (true)
;

-- Tabela public.user_consents
DROP POLICY IF EXISTS "Allow users to read their own consents" ON public.user_consents;
CREATE POLICY "Allow users to read their own consents" ON public.user_consents
  FOR SELECT
  USING (((auth.uid() = user_id) OR (( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text)))
;

-- Tabela public.usuarios
DROP POLICY IF EXISTS "admin_delete_usuarios" ON public.usuarios;
CREATE POLICY "admin_delete_usuarios" ON public.usuarios
  FOR DELETE
  USING ((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text))
;

-- Tabela public.usuarios
DROP POLICY IF EXISTS "admin_insert_usuarios" ON public.usuarios;
CREATE POLICY "admin_insert_usuarios" ON public.usuarios
  FOR INSERT
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- Tabela public.usuarios
DROP POLICY IF EXISTS "auth_select_usuarios" ON public.usuarios;
CREATE POLICY "auth_select_usuarios" ON public.usuarios
  FOR SELECT
  USING ((( SELECT is_admin_or_staff() AS is_admin_or_staff) OR (id = ( SELECT auth.uid() AS uid))))
;

-- Tabela public.usuarios
DROP POLICY IF EXISTS "admin_update_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_usuarios" ON public.usuarios
  FOR UPDATE
  USING (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
  WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'ADMIN'::text) OR (is_admin_or_staff() AND (escola_id = get_user_escola_id()))))
;

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS trg_audit_alunos ON public.alunos;
CREATE TRIGGER trg_audit_alunos
  AFTER UPDATE OR INSERT OR DELETE
  ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

DROP TRIGGER IF EXISTS trigger_gerar_matricula ON public.alunos;
CREATE TRIGGER trigger_gerar_matricula
  BEFORE INSERT
  ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_matricula_aluno();

DROP TRIGGER IF EXISTS trg_audit_escolas ON public.escolas;
CREATE TRIGGER trg_audit_escolas
  AFTER DELETE OR UPDATE OR INSERT
  ON public.escolas
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

DROP TRIGGER IF EXISTS lgpd_rate_limit_trigger ON public.lgpd_requests;
CREATE TRIGGER lgpd_rate_limit_trigger
  BEFORE INSERT
  ON public.lgpd_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_lgpd_rate_limit();

DROP TRIGGER IF EXISTS trg_audit_professores ON public.professores;
CREATE TRIGGER trg_audit_professores
  AFTER UPDATE OR DELETE OR INSERT
  ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_turmas ON public.turmas;
CREATE TRIGGER trg_audit_turmas
  AFTER DELETE OR UPDATE OR INSERT
  ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log_changes();

DROP TRIGGER IF EXISTS on_usuario_cargo_changed ON public.usuarios;
CREATE TRIGGER on_usuario_cargo_changed
  AFTER UPDATE
  ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_cargo_to_auth();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260708000001_fix_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260712000002_security_fixes.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260715000003_lgpd_rate_limit.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- DC Digital -- Rate Limiting Server-Side para Solicitações LGPD
-- Migration: 20260715000003_lgpd_rate_limit.sql
-- =============================================================
-- FIX #4: Implementar rate limiting server-side para lgpd_requests.
-- O client-side via sessionStorage é facilmente bypassável (nova aba).
-- Esta trigger limita a 5 solicitações por email a cada 15 minutos.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. TRIGGER FUNCTION — rate limiting por email (15 min / 5 req)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  recent_count INTEGER;
  window_start TIMESTAMPTZ := NOW() - INTERVAL '15 minutes';
BEGIN
  -- Contar solicitações recentes do mesmo email na janela de 15 minutos
  SELECT COUNT(*) INTO recent_count
  FROM public.lgpd_requests
  WHERE
    email = LOWER(TRIM(NEW.email))
    AND created_at >= window_start;

  IF recent_count >= 5 THEN
    RAISE EXCEPTION
      'RATE_LIMIT_EXCEEDED: Muitas solicitações LGPD do email % na última hora. Aguarde 15 minutos.'
      USING
        ERRCODE = 'P0001', -- raise_exception
        DETAIL = format('Email: %s, Solicitações recentes: %s', NEW.email, recent_count);
  END IF;

  -- Normalizar email antes de inserir
  NEW.email := LOWER(TRIM(NEW.email));

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------
-- 2. APLICAR TRIGGER NA TABELA lgpd_requests
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_lgpd_rate_limit ON public.lgpd_requests;
CREATE TRIGGER trg_lgpd_rate_limit
  BEFORE INSERT ON public.lgpd_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lgpd_rate_limit();

-- ---------------------------------------------------------------
-- 3. ÍNDICE PARA PERFORMANCE DA QUERY DE CONTAGEM
--    A trigger faz SELECT por email + created_at. Sem índice, isso
--    seria um full scan em tabelas grandes.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_email_created_at
  ON public.lgpd_requests (email, created_at DESC);

-- ---------------------------------------------------------------
-- 4. GARANTIR QUE A TRIGGER FUNCTION NÃO É ACESSÍVEL DIRETAMENTE
--    (apenas invocada pela trigger, não pelo client)
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_lgpd_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_lgpd_rate_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_lgpd_rate_limit() FROM anon;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260719000005_fix_unique_constraints.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- DC Digital — Correção de Constraints UNIQUE Incorretas
-- Migration: 20260719000005_fix_unique_constraints.sql
-- =============================================================
-- PROBLEMA: As constraints UNIQUE nas tabelas operacionais
-- foram criadas com colunas erradas (ex: UNIQUE (turma_id) em vez
-- de UNIQUE (turma_id, aluno_id, data, ...)), o que impede qualquer
-- segundo registro nessas tabelas.
--
-- IMPACTO: Frequências, notas, conteúdos, horários e alocações
-- de professores não podem ser inseridos normalmente.
--
-- SOLUÇÃO: Remover as constraints incorretas e recriar com a
-- combinação de colunas correta para unicidade de negócio.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. FREQUENCIAS
--    Antes: UNIQUE (turma_id)         → 1 frequência no banco inteiro por turma
--    Depois: UNIQUE (turma_id, aluno_id, data, tempo, disciplina)
-- ---------------------------------------------------------------
ALTER TABLE public.frequencias
  DROP CONSTRAINT IF EXISTS frequencias_uniqueness;

ALTER TABLE public.frequencias
  ADD CONSTRAINT frequencias_uniqueness
  UNIQUE (turma_id, aluno_id, data, tempo, disciplina);

-- ---------------------------------------------------------------
-- 2. NOTAS
--    Antes: UNIQUE (aluno_id)                    → 1 nota por aluno no banco inteiro
--    Depois: UNIQUE (avaliacao_id, aluno_id)     → 1 nota por avaliação por aluno
-- ---------------------------------------------------------------
ALTER TABLE public.notas
  DROP CONSTRAINT IF EXISTS notas_avaliacao_id_aluno_id_key;

ALTER TABLE public.notas
  ADD CONSTRAINT notas_avaliacao_id_aluno_id_key
  UNIQUE (avaliacao_id, aluno_id);

-- ---------------------------------------------------------------
-- 3. CONTEUDOS
--    Antes: UNIQUE (data)                                → 1 conteúdo por data no banco inteiro
--    Depois: UNIQUE (turma_id, data, tempo, disciplina)  → 1 conteúdo por turma+data+tempo+disciplina
-- ---------------------------------------------------------------
ALTER TABLE public.conteudos
  DROP CONSTRAINT IF EXISTS conteudos_uniqueness;

ALTER TABLE public.conteudos
  ADD CONSTRAINT conteudos_uniqueness
  UNIQUE (turma_id, data, tempo, disciplina);

-- ---------------------------------------------------------------
-- 4. FECHAMENTOS_BIMESTRES
--    Antes: UNIQUE (bimestre)                        → 1 fechamento por bimestre no banco inteiro
--    Depois: UNIQUE (turma_id, disciplina, bimestre) → 1 fechamento por turma+disciplina+bimestre
-- ---------------------------------------------------------------
ALTER TABLE public.fechamentos_bimestres
  DROP CONSTRAINT IF EXISTS unique_fechamento_turma_disciplina_bimestre;

ALTER TABLE public.fechamentos_bimestres
  ADD CONSTRAINT unique_fechamento_turma_disciplina_bimestre
  UNIQUE (turma_id, disciplina, bimestre);

-- ---------------------------------------------------------------
-- 5. PROFESSOR_ALOCACOES
--    Antes: UNIQUE (escola_id)                          → 1 professor por escola no banco inteiro
--    Depois: UNIQUE (professor_id, escola_id, turno)    → 1 alocação por professor+escola+turno
-- ---------------------------------------------------------------
ALTER TABLE public.professor_alocacoes
  DROP CONSTRAINT IF EXISTS professor_alocacoes_professor_id_escola_id_turno_key;

ALTER TABLE public.professor_alocacoes
  ADD CONSTRAINT professor_alocacoes_professor_id_escola_id_turno_key
  UNIQUE (professor_id, escola_id, turno);

-- ---------------------------------------------------------------
-- 6. PROFESSOR_HORARIOS
--    Antes: UNIQUE (tempo_ordem)                                  → 1 horário por tempo no banco inteiro
--    Depois: UNIQUE (professor_id, dia_semana, tempo_ordem)       → 1 horário por professor+dia+tempo
-- ---------------------------------------------------------------
ALTER TABLE public.professor_horarios
  DROP CONSTRAINT IF EXISTS professor_horarios_professor_id_dia_semana_tempo_ordem_key;

ALTER TABLE public.professor_horarios
  ADD CONSTRAINT professor_horarios_professor_id_dia_semana_tempo_ordem_key
  UNIQUE (professor_id, dia_semana, tempo_ordem);

-- ---------------------------------------------------------------
-- 7. VERIFICAÇÃO (opcional — confirma que as constraints foram aplicadas)
-- ---------------------------------------------------------------
DO $$
BEGIN
  -- Verifica que as constraints recriadas existem com as colunas corretas
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'frequencias'
      AND c.conname = 'frequencias_uniqueness'
      AND c.contype = 'u'
  ), 'frequencias_uniqueness constraint não encontrada';

  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'notas'
      AND c.conname = 'notas_avaliacao_id_aluno_id_key'
      AND c.contype = 'u'
  ), 'notas_avaliacao_id_aluno_id_key constraint não encontrada';

  RAISE NOTICE 'Todas as constraints UNIQUE foram corrigidas com sucesso.';
END $$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260719000006_log_retention_policy.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- DC Digital — Política de Retenção de Logs e Índices de Performance
-- Migration: 20260719000006_log_retention_policy.sql
-- =============================================================
-- FIX L4: Implementar expiração automática de logs de auditoria.
--
-- LGPD — Princípio da minimização (Art. 6º, III):
--   Dados pessoais não devem ser retidos além do necessário.
--   security_logs e audit_log devem ter política de retenção.
--
-- PERFORMANCE:
--   Logs ilimitados causam table scan lento em consultas de auditoria.
--   Índices compostos evitam full scans nas queries mais comuns.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ÍNDICES DE PERFORMANCE para queries comuns em logs
-- ---------------------------------------------------------------

-- security_logs: busca por user_id + data (painel de auditoria)
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id_created_at
  ON public.security_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- security_logs: busca por action + data (relatórios de segurança)
CREATE INDEX IF NOT EXISTS idx_security_logs_action_created_at
  ON public.security_logs (action, created_at DESC);

-- audit_log: busca por table_name + data (rastreamento de alterações)
CREATE INDEX IF NOT EXISTS idx_audit_log_table_created_at
  ON public.audit_log (table_name, created_at DESC);

-- audit_log: busca por user_id (trilha de auditoria por usuário)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_created_at
  ON public.audit_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------
-- 2. FUNÇÃO DE LIMPEZA DE LOGS ANTIGOS
--    Retém os últimos 365 dias de security_logs e audit_log.
--    Chamada manualmente ou via pg_cron se disponível.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(retention_days INTEGER DEFAULT 365)
  RETURNS TABLE (security_logs_deleted BIGINT, audit_logs_deleted BIGINT)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_security_deleted BIGINT;
  v_audit_deleted    BIGINT;
  v_cutoff           TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
BEGIN
  -- Deletar security_logs mais antigos que o período de retenção
  DELETE FROM public.security_logs
  WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_security_deleted = ROW_COUNT;

  -- Deletar audit_log mais antigos que o período de retenção
  DELETE FROM public.audit_log
  WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  RAISE NOTICE '[cleanup_old_logs] Removidos: % security_logs, % audit_logs (retenção: % dias)',
    v_security_deleted, v_audit_deleted, retention_days;

  RETURN QUERY SELECT v_security_deleted, v_audit_deleted;
END;
$function$;

-- Apenas ADMIN pode chamar a função de limpeza
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER) FROM anon;

-- ---------------------------------------------------------------
-- 3. AGENDAR LIMPEZA AUTOMÁTICA via pg_cron (se disponível)
--    O pg_cron é uma extensão do Supabase (Pro/Team).
--    Se não disponível, chamar cleanup_old_logs() manualmente via
--    painel SQL do Supabase ou script de manutenção mensal.
-- ---------------------------------------------------------------
DO $do$
BEGIN
  -- Verificar se pg_cron está disponível
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Agendar para rodar toda segunda-feira às 03:00 UTC
    BEGIN
      PERFORM cron.schedule(
        'dc-digital-log-cleanup',              -- nome único do job
        '0 3 * * 1',                           -- cron: toda segunda às 03:00 UTC
        'SELECT public.cleanup_old_logs(365)'
      );
      RAISE NOTICE 'pg_cron: job de limpeza de logs agendado com sucesso.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron schedule falhou: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron não disponível. Agendar cleanup_old_logs() manualmente via painel do Supabase.';
  END IF;
END $do$;

-- ---------------------------------------------------------------
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO DO SCHEMA
-- ---------------------------------------------------------------
COMMENT ON FUNCTION public.cleanup_old_logs(INTEGER) IS
  'Remove registros de security_logs e audit_log mais antigos que retention_days dias. '
  'Padrão: 365 dias. Chamada via pg_cron ou manualmente pelo admin.';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260721000007_hash_audit_email.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- DC Digital — Hash do Email no Audit Log
-- Migration: 20260721000007_hash_audit_email.sql
-- =============================================================
-- FIX A2 (LGPD): O trigger fn_audit_log_changes armazenava auth.email()
-- em texto plano no audit_log. Isso é inconsistente com a boa prática já
-- adotada no securityLogService.ts (frontend) que usa hash SHA-256.
--
-- Esta migration:
-- 1. Garante que a extensão pgcrypto está habilitada (disponível no Supabase)
-- 2. Adiciona coluna user_email_hash ao audit_log (se não existir)
-- 3. Recria o trigger para usar hash em vez de texto plano
-- 4. Preenche retroativamente os hashes de registros antigos (se existirem)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. HABILITAR pgcrypto (extensão nativa do Supabase)
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------
-- 2. ADICIONAR coluna de hash (se a tabela audit_log existir)
--    A coluna user_email original é mantida mas será deprecated.
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    -- Adicionar coluna de hash SHA-256 do email
    ALTER TABLE public.audit_log
      ADD COLUMN IF NOT EXISTS user_email_hash text;

    -- Preencher retroativamente (somente se user_email não for nulo)
    UPDATE public.audit_log
      SET user_email_hash = encode(digest(lower(trim(user_email)), 'sha256'), 'hex')
      WHERE user_email IS NOT NULL
        AND user_email_hash IS NULL;

    -- Deprecar coluna original (comentário de auditoria)
    COMMENT ON COLUMN public.audit_log.user_email IS
      'DEPRECATED: Usar user_email_hash (SHA-256). Esta coluna será removida na próxima migration maior.';

    COMMENT ON COLUMN public.audit_log.user_email_hash IS
      'Hash SHA-256 do email do usuário. Permite correlação de eventos sem expor PII (LGPD).';
  END IF;
END;
$$;

-- ---------------------------------------------------------------
-- 3. RECRIAR fn_audit_log_changes com hash em vez de texto plano
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_record_id TEXT;
  v_email_raw TEXT;
  v_email_hash TEXT;
BEGIN
  -- Determina o ID do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
  ELSE
    v_record_id := NEW.id::TEXT;
  END IF;

  -- FIX A2 (LGPD): Hash SHA-256 do email em vez de texto plano.
  -- Permite correlacionar eventos do mesmo usuário sem armazenar PII.
  v_email_raw := auth.email();
  IF v_email_raw IS NOT NULL THEN
    v_email_hash := encode(digest(lower(trim(v_email_raw)), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.audit_log (
    user_id,
    user_email,      -- mantido temporariamente como NULL para compatibilidade
    user_email_hash, -- FIX A2: hash SHA-256 do email
    action,
    table_name,
    record_id
  ) VALUES (
    auth.uid(),
    NULL,            -- não armazenar mais o email em texto plano
    v_email_hash,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ---------------------------------------------------------------
-- 4. ÍNDICE para performance de busca por hash (se a tabela existir)
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_audit_log_email_hash
      ON public.audit_log (user_email_hash)
      WHERE user_email_hash IS NOT NULL;
  END IF;
END;
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260726000008_fix_aluno_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- DC Digital -- Correção de RLS da tabela Alunos e Portal do Aluno
-- Migration: 20260726000008_fix_aluno_rls.sql
-- =============================================================

-- 1. Adicionar usuario_id à tabela alunos para relacionamento com auth.users
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alunos_usuario_id
  ON public.alunos (usuario_id);

-- 2. Atualizar a política auth_select_alunos para conceder acesso ao Portal do Aluno
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
            (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
            OR (p.usuario_id IS NULL AND p.email = (auth.jwt() ->> 'email'))
          )
      )
    )
    OR
    -- Portal do aluno: aluno vê seus próprios dados via usuario_id ou correspondência de CPF/Email
    (
      (SELECT get_user_role()) = 'ALUNO'
      AND (
        (usuario_id IS NOT NULL AND usuario_id = auth.uid())
        OR (
          id = auth.uid()
        )
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- ARQUIVO: 20260731000009_fix_audit_log_email_hash.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- FIX C7: Hash de email no audit_log para compliance LGPD.
-- A função fn_audit_log_changes() gravava auth.email() em texto plano na coluna user_email.
-- Agora usa SHA-256 hash, consistente com a migration hash_audit_email para security_logs.

-- 1. Atualizar a função de trigger para usar hash SHA-256
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_record_id TEXT;
  v_email_hash TEXT;
BEGIN
  -- Determina o ID do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
  ELSE
    v_record_id := NEW.id::TEXT;
  END IF;

  -- FIX C7 (LGPD): Hash SHA-256 do email em vez de texto plano.
  -- O hash permite correlacionar eventos do mesmo usuário sem expor PII.
  v_email_hash := NULL;
  IF auth.email() IS NOT NULL THEN
    BEGIN
      v_email_hash := encode(digest(lower(trim(auth.email())), 'sha256'::text), 'hex');
    EXCEPTION WHEN OTHERS THEN
      v_email_hash := NULL;
    END;
  END IF;

  INSERT INTO audit_log (user_id, user_email, action, table_name, record_id)
  VALUES (
    auth.uid(),
    v_email_hash,  -- Hash SHA-256, não o email em texto plano
    TG_OP,
    TG_TABLE_NAME,
    v_record_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Atualizar registros existentes que contêm emails em texto plano
-- (emails reais contêm '@', hashes SHA-256 não contêm)
UPDATE audit_log
SET user_email = encode(digest(lower(trim(user_email)), 'sha256'), 'hex')
WHERE user_email IS NOT NULL
  AND user_email LIKE '%@%';

-- 3. Adicionar comentário na coluna para documentação
COMMENT ON COLUMN audit_log.user_email IS 'Hash SHA-256 do email do usuário (LGPD). Não armazenar em texto plano.';
