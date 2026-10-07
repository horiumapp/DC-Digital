DO $$
DECLARE
  v_res jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"6a638862-bad3-4308-adaf-37dc7d3487e6","role":"authenticated","email":"jackison.silva@prof.am.gov.br"}', true);
  SET ROLE authenticated;
  SELECT public.apply_academic_mutation(
    'frequencias',
    'UPSERT',
    '{"turma_id":"94ca5b5d-e8bc-43d2-a879-73589c88941c","aluno_id":"0c2440bd-d863-4939-b16d-ca609ac9aa19","data":"2026-04-23","tempo":"4º TEMPO","disciplina":"Matemática","status":"P","participacao":"Presencial","_expected_revision":2768}',
    gen_random_uuid()
  ) INTO v_res;
  RAISE NOTICE 'Resultado: %', v_res;
END $$;
