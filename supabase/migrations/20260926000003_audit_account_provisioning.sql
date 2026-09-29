BEGIN;
-- Only the trusted account provisioning function may call this transaction.
CREATE OR REPLACE FUNCTION public.finalize_provisioned_user(
 p_actor uuid,p_user uuid,p_email text,p_nome text,p_cargo text,p_escola uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.usuarios%ROWTYPE; a public.alunos%ROWTYPE; p public.professores%ROWTYPE; v_count integer;
BEGIN
 SELECT * INTO actor FROM public.usuarios WHERE id=p_actor FOR SHARE;
 IF NOT FOUND OR actor.cargo NOT IN ('ADMIN','GESTOR','SECRETARIO') THEN RAISE EXCEPTION 'Perfil sem permissão' USING ERRCODE='42501'; END IF;
 IF actor.cargo<>'ADMIN' AND (actor.escola_id IS DISTINCT FROM p_escola OR p_cargo NOT IN ('PROFESSOR','ALUNO')) THEN
  RAISE EXCEPTION 'Escola ou cargo não autorizado' USING ERRCODE='42501'; END IF;
 IF p_cargo NOT IN ('ADMIN','GESTOR','SECRETARIO','PROFESSOR','ALUNO') THEN RAISE EXCEPTION 'Cargo inválido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=lower(p_email)) THEN RAISE EXCEPTION 'Identidade não confere'; END IF;
 IF p_cargo='ALUNO' THEN
  IF p_email !~ '^[0-9]{11}@aluno\.dcdigital\.local$' THEN RAISE EXCEPTION 'Conta de aluno exige identidade institucional válida'; END IF;
  SELECT count(*) INTO v_count FROM public.alunos WHERE regexp_replace(cpf,'\D','','g')=split_part(p_email,'@',1);
  IF v_count<>1 THEN RAISE EXCEPTION 'Aluno não encontrado ou CPF ambíguo'; END IF;
  SELECT * INTO a FROM public.alunos WHERE regexp_replace(cpf,'\D','','g')=split_part(p_email,'@',1) FOR UPDATE;
  IF a.escola_id IS DISTINCT FROM p_escola OR (a.usuario_id IS NOT NULL AND a.usuario_id<>p_user) THEN
   RAISE EXCEPTION 'Aluno de outra escola ou já vinculado' USING ERRCODE='42501'; END IF;
  UPDATE public.alunos SET usuario_id=p_user WHERE id=a.id;
 ELSIF p_cargo='PROFESSOR' THEN
  SELECT * INTO p FROM public.professores WHERE lower(email)=lower(p_email) FOR UPDATE;
  IF FOUND THEN
   IF (p.usuario_id IS NOT NULL AND p.usuario_id<>p_user) OR
      (actor.cargo<>'ADMIN' AND NOT EXISTS(SELECT 1 FROM public.professor_alocacoes WHERE professor_id=p.id AND escola_id=p_escola)) THEN
    RAISE EXCEPTION 'Professor já vinculado ou sem lotação na escola' USING ERRCODE='42501'; END IF;
   UPDATE public.professores SET usuario_id=p_user WHERE id=p.id;
  ELSE
   INSERT INTO public.professores(nome,email,usuario_id,status) VALUES(p_nome,lower(p_email),p_user,'Inativo');
  END IF;
 END IF;
 INSERT INTO public.usuarios(id,email,nome_completo,cargo,escola_id) VALUES(p_user,lower(p_email),p_nome,p_cargo,p_escola)
 ON CONFLICT(id) DO UPDATE SET cargo=excluded.cargo,escola_id=excluded.escola_id,nome_completo=excluded.nome_completo;
 UPDATE auth.users SET raw_app_meta_data=coalesce(raw_app_meta_data,'{}')||jsonb_build_object('role',p_cargo) WHERE id=p_user;
END $$;
REVOKE ALL ON FUNCTION public.finalize_provisioned_user(uuid,uuid,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_provisioned_user(uuid,uuid,text,text,text,uuid) TO service_role;
COMMIT;
