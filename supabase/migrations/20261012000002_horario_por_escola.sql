-- Um professor pode lecionar o mesmo tempo em escolas diferentes
-- (manhã em uma, tarde em outra). A unicidade antiga era só
-- professor + dia + tempo, então gravar a segunda escola
-- esbarrava no horário da primeira e o salvamento voltava 409.

ALTER TABLE public.professor_horarios
  DROP CONSTRAINT IF EXISTS professor_horarios_professor_id_dia_semana_tempo_ordem_key;

ALTER TABLE public.professor_horarios
  DROP CONSTRAINT IF EXISTS professor_horarios_professor_escola_dia_tempo_key;

ALTER TABLE public.professor_horarios
  ADD CONSTRAINT professor_horarios_professor_escola_dia_tempo_key
  UNIQUE (professor_id, escola_id, dia_semana, tempo_ordem);
