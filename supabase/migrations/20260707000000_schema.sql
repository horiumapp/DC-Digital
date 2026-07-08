-- DC Digital — Banco de Dados Schema Inicial

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
    (SELECT cargo FROM public.usuarios WHERE id = (SELECT auth.uid())),
    'PROFESSOR'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_secure()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT COALESCE(
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'),
    (SELECT cargo FROM public.usuarios WHERE id = (SELECT auth.uid())),
    'PROFESSOR'
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
  CONSTRAINT conteudos_uniqueness UNIQUE (data)
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
  CONSTRAINT unique_fechamento_turma_disciplina_bimestre UNIQUE (bimestre)
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
  CONSTRAINT frequencias_uniqueness UNIQUE (turma_id)
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
  CONSTRAINT notas_avaliacao_id_aluno_id_key UNIQUE (aluno_id)
);

CREATE TABLE IF NOT EXISTS public.professor_alocacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL,
  escola_id uuid NOT NULL,
  turno text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT professor_alocacoes_pkey PRIMARY KEY (id),
  CONSTRAINT professor_alocacoes_professor_id_escola_id_turno_key UNIQUE (escola_id)
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
  CONSTRAINT professor_horarios_professor_id_dia_semana_tempo_ordem_key UNIQUE (tempo_ordem)
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
  disciplinas ARRAY DEFAULT '{}'::text[],
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

