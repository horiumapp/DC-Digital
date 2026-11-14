-- Edição de aluno: dados cadastrais e CPF gravados na mesma transação.
-- SECURITY INVOKER: o UPDATE continua sujeito ao RLS e aos GRANTs de coluna
-- de quem chama; o CPF passa por definir_cpf_aluno, que valida o escopo.
CREATE OR REPLACE FUNCTION public.atualizar_aluno_com_cpf(
  p_id uuid,
  p_dados jsonb,
  p_cpf text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  -- Chave ausente em p_dados mantém o valor atual (mesmo efeito do PATCH do PostgREST).
  UPDATE public.alunos a
  SET escola_id        = CASE WHEN p_dados ? 'escola_id' THEN (p_dados ->> 'escola_id')::uuid ELSE a.escola_id END,
      turma_id         = CASE WHEN p_dados ? 'turma_id' THEN NULLIF(p_dados ->> 'turma_id', '')::uuid ELSE a.turma_id END,
      nome             = CASE WHEN p_dados ? 'nome' THEN p_dados ->> 'nome' ELSE a.nome END,
      data_nascimento  = CASE WHEN p_dados ? 'data_nascimento' THEN (p_dados ->> 'data_nascimento')::date ELSE a.data_nascimento END,
      sexo             = CASE WHEN p_dados ? 'sexo' THEN p_dados ->> 'sexo' ELSE a.sexo END,
      nome_responsavel = CASE WHEN p_dados ? 'nome_responsavel' THEN p_dados ->> 'nome_responsavel' ELSE a.nome_responsavel END,
      telefone         = CASE WHEN p_dados ? 'telefone' THEN p_dados ->> 'telefone' ELSE a.telefone END,
      endereco         = CASE WHEN p_dados ? 'endereco' THEN p_dados ->> 'endereco' ELSE a.endereco END,
      status           = CASE WHEN p_dados ? 'status' THEN p_dados ->> 'status' ELSE a.status END
  WHERE a.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado ou sem permissão' USING ERRCODE = '42501';
  END IF;

  PERFORM public.definir_cpf_aluno(p_id, p_cpf);
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_aluno_com_cpf(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_aluno_com_cpf(uuid, jsonb, text) TO authenticated;
