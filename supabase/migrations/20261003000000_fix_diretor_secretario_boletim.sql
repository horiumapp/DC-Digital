-- =============================================================
-- DC Digital — Fix: Resolução e sincronização de Diretor(a) e Secretário(a)
-- Migration: 20261003000000_fix_diretor_secretario_boletim.sql
-- =============================================================
--
-- MOTIVO:
--   No Boletim do Portal do Aluno, escolas exibiam "Não localizado"
--   porque o campo textual da tabela escolas continha essa string legada
--   de importações anteriores, impedindo a visualização dos servidores
--   realmente alocados na escola (public.usuarios).
--   Esta migration:
--   1. Atualiza get_diretor_escola e get_secretario_escola para priorizar
--      a equipe ativa alocada em public.usuarios e descartar placeholders.
--   2. Permite execução pelas roles authenticated, anon e service_role.
--   3. Limpa placeholders em public.escolas e sincroniza com usuarios alocados.
-- =============================================================

-- 1. Helper para obter o nome do(a) Secretário(a) da escola com prioridade nos alocados
CREATE OR REPLACE FUNCTION public.get_secretario_escola(p_escola_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text;
BEGIN
  -- Prioridade 1: Usuário alocado na tabela usuarios com perfil SECRETARIO
  SELECT trim(nome_completo) INTO v_nome
  FROM public.usuarios
  WHERE escola_id = p_escola_id
    AND cargo = 'SECRETARIO'
    AND nome_completo IS NOT NULL
    AND trim(nome_completo) <> ''
    AND lower(trim(nome_completo)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_nome IS NOT NULL AND v_nome <> '' THEN
    RETURN v_nome;
  END IF;

  -- Prioridade 2: Campo textual da tabela escolas (se válido e não placeholder)
  SELECT trim(secretario) INTO v_nome
  FROM public.escolas
  WHERE id = p_escola_id
    AND secretario IS NOT NULL
    AND trim(secretario) <> ''
    AND lower(trim(secretario)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  LIMIT 1;

  RETURN COALESCE(v_nome, '');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_secretario_escola(uuid) TO authenticated, anon, service_role;

-- 2. Helper para obter o nome do(a) Diretor(a) / Gestor(a) da escola com prioridade nos alocados
CREATE OR REPLACE FUNCTION public.get_diretor_escola(p_escola_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text;
BEGIN
  -- Prioridade 1: Usuário alocado na tabela usuarios com perfil GESTOR
  SELECT trim(nome_completo) INTO v_nome
  FROM public.usuarios
  WHERE escola_id = p_escola_id
    AND cargo = 'GESTOR'
    AND nome_completo IS NOT NULL
    AND trim(nome_completo) <> ''
    AND lower(trim(nome_completo)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_nome IS NOT NULL AND v_nome <> '' THEN
    RETURN v_nome;
  END IF;

  -- Prioridade 2: Campo textual da tabela escolas (se válido e não placeholder)
  SELECT trim(diretor) INTO v_nome
  FROM public.escolas
  WHERE id = p_escola_id
    AND diretor IS NOT NULL
    AND trim(diretor) <> ''
    AND lower(trim(diretor)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  LIMIT 1;

  RETURN COALESCE(v_nome, '');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_diretor_escola(uuid) TO authenticated, anon, service_role;

-- 3. Limpeza de placeholders em escolas
UPDATE public.escolas
SET diretor = NULL
WHERE diretor IS NOT NULL
  AND lower(trim(diretor)) IN (
    'não localizado', 'nao localizado', 'não informado', 'nao informado',
    'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
  );

UPDATE public.escolas
SET secretario = NULL
WHERE secretario IS NOT NULL
  AND lower(trim(secretario)) IN (
    'não localizado', 'nao localizado', 'não informado', 'nao informado',
    'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
  );

-- 4. Sincronização automática de escolas que possuem usuários alocados mas campo vazio
UPDATE public.escolas e
SET diretor = u.nome_completo
FROM (
  SELECT DISTINCT ON (escola_id) escola_id, trim(nome_completo) as nome_completo
  FROM public.usuarios
  WHERE cargo = 'GESTOR'
    AND nome_completo IS NOT NULL
    AND trim(nome_completo) <> ''
    AND lower(trim(nome_completo)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  ORDER BY escola_id, criado_em ASC
) u
WHERE e.id = u.escola_id
  AND (e.diretor IS NULL OR trim(e.diretor) = '');

UPDATE public.escolas e
SET secretario = u.nome_completo
FROM (
  SELECT DISTINCT ON (escola_id) escola_id, trim(nome_completo) as nome_completo
  FROM public.usuarios
  WHERE cargo = 'SECRETARIO'
    AND nome_completo IS NOT NULL
    AND trim(nome_completo) <> ''
    AND lower(trim(nome_completo)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  ORDER BY escola_id, criado_em ASC
) u
WHERE e.id = u.escola_id
  AND (e.secretario IS NULL OR trim(e.secretario) = '');
