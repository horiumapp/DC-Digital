-- O autor do fechamento é quem está autenticado.
-- O payload da sincronização não escolhe outro usuario_fechamento_id.

CREATE OR REPLACE FUNCTION public.forcar_autor_fechamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.usuario_fechamento_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forcar_autor_fechamento ON public.fechamentos_bimestres;
CREATE TRIGGER forcar_autor_fechamento
  BEFORE INSERT OR UPDATE ON public.fechamentos_bimestres
  FOR EACH ROW
  EXECUTE FUNCTION public.forcar_autor_fechamento();
