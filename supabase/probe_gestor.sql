DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE supabase_auth_admin';
    INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      gen_random_uuid(),
      'probe-gestor-rollback@example.invalid',
      '{"role":"PENDENTE"}'::jsonb,
      '{"full_name":"Probe"}'::jsonb,
      'authenticated',
      'authenticated'
    );
    RAISE EXCEPTION 'probe_ok';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'PROBE % : %', SQLSTATE, SQLERRM;
  END;
END $$;
