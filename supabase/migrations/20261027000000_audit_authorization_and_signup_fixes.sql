-- =============================================================
-- Correções de autorização identificadas na auditoria de bugs
--
-- 1. Sequestro de identidade de professor (cross-tenant).
-- 2. Política de INSERT órfã em user_consents.
-- 3. Regressão do bloqueio de cadastro público sem cargo.
-- =============================================================

-- -------------------------------------------------------------
-- 1. professores: apenas ADMIN pode (re)vincular a conta de acesso
--    -----------------------------------------------------------
-- A política "admin_update_professores" (20260707000000) libera UPDATE para
-- GESTOR/SECRETARIO quando existe alocação do professor na própria escola, e a
-- concessão de colunas de 20261013000001 inclui `usuario_id` e `email`.
-- Como qualquer GESTOR/SECRETARIO pode criar a alocação (20260828000019 não
-- restringe professor_id), duas operações permitidas em conjunto permitiam
-- apontar `usuario_id` para a própria conta e assumir o professor de outra
-- escola — com isso `professor_tem_acesso_a_turma*` passa a liberar leitura e
-- escrita de notas/frequências daquela escola.
--
-- Alocar um professor em mais de uma escola continua permitido (lotação
-- múltipla); o que deixa de ser permitido, fora do ADMIN, é trocar a identidade
-- de acesso do registro.
CREATE OR REPLACE FUNCTION public.guard_professor_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Chamadas internas de provisionamento (app.sync_internal / service_role)
  -- rodam sem auth.uid(): a identidade é decidida por finalize_provisioned_user.
  IF (SELECT public.get_user_role()) = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id THEN
    RAISE EXCEPTION 'Somente o administrador pode vincular ou desvincular a conta de acesso do professor.'
      USING ERRCODE = '42501';
  END IF;

  IF lower(btrim(coalesce(NEW.email, ''))) IS DISTINCT FROM lower(btrim(coalesce(OLD.email, ''))) THEN
    RAISE EXCEPTION 'Somente o administrador pode alterar o e-mail institucional do professor.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_professor_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_professor_identity ON public.professores;
CREATE TRIGGER trg_guard_professor_identity
  BEFORE UPDATE OF usuario_id, email ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_professor_identity();

-- -------------------------------------------------------------
-- 2. user_consents: remover a política de INSERT órfã
-- -----------------------------------------------------------
-- 20260708000001 criou "Allow insert for user_consents" (permite user_id NULL).
-- 20260828000017 tentou substituí-la, mas só removeu os nomes
-- "Allow public insert for user_consents" e "auth_insert_user_consents".
-- Políticas permissivas são somadas (OR), então o ramo anônimo continuava ativo
-- e permitia forjar registros de consentimento sem titular identificado.
DROP POLICY IF EXISTS "Allow insert for user_consents" ON public.user_consents;
REVOKE ALL ON TABLE public.user_consents FROM anon;

-- -------------------------------------------------------------
-- 3. reject_public_signup: NÃO alterado nesta migration
-- -----------------------------------------------------------
-- 20261013000001 passou a aceitar cadastro sem nenhum cargo em app_metadata
-- (`IF cargo = '' THEN RETURN NEW`), o que anula o bloqueio de cadastro público
-- documentado em 20261009000003. A correção parece ser remover esse atalho, mas
-- ela afeta qualquer fluxo do GoTrue que insira em auth.users sem app_metadata.role
-- e exige confirmação de quem opera a autenticação. Registrado como pendência.
