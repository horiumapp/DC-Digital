-- Sessão única por conta: carimbo em usuarios + RPCs de claim/leitura.
-- Complementa supabase.auth.signOut({ scope: 'others' }) no client.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS sessao_ativa_id uuid;

COMMENT ON COLUMN public.usuarios.sessao_ativa_id IS
  'UUID da sessão ativa. Novo login gera outro valor e invalida clientes anteriores.';

CREATE OR REPLACE FUNCTION public.claim_user_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  UPDATE public.usuarios
  SET sessao_ativa_id = v_id
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil institucional não encontrado' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_sessao_ativa()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT sessao_ativa_id
  FROM public.usuarios
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.claim_user_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_user_session() TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_sessao_ativa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_sessao_ativa() TO authenticated;
