
-- Add cover photo path per equipment (admin sets on detail screen)
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS cover_storage_path text;

-- Link a photo to a specific maintenance history entry (optional)
ALTER TABLE public.equipamento_fotos
  ADD COLUMN IF NOT EXISTS manutencao_historico_id uuid REFERENCES public.manutencao_historico(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS equipamento_fotos_hist_idx ON public.equipamento_fotos(manutencao_historico_id);

-- Update field permission trigger: allow COLABORADOR to edit filter/lubricant fields AND cover_storage_path is admin-only
CREATE OR REPLACE FUNCTION public.equipamentos_enforce_field_perms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin') THEN
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    RETURN NEW;
  END IF;

  -- Colaborador: bloquear apenas dados cadastrais/revisao. Permitir horímetro, observações,
  -- filtros e lubrificantes.
  IF NEW.item              IS DISTINCT FROM OLD.item             OR
     NEW.cl                IS DISTINCT FROM OLD.cl               OR
     NEW.numero            IS DISTINCT FROM OLD.numero           OR
     NEW.cartao_ticket     IS DISTINCT FROM OLD.cartao_ticket    OR
     NEW.identificacao     IS DISTINCT FROM OLD.identificacao    OR
     NEW.afericao_taco     IS DISTINCT FROM OLD.afericao_taco    OR
     NEW.placa             IS DISTINCT FROM OLD.placa            OR
     NEW.ano               IS DISTINCT FROM OLD.ano              OR
     NEW.localizacao       IS DISTINCT FROM OLD.localizacao      OR
     NEW.operador_contato  IS DISTINCT FROM OLD.operador_contato OR
     NEW.telefone          IS DISTINCT FROM OLD.telefone         OR
     NEW.cnh               IS DISTINCT FROM OLD.cnh              OR
     NEW.data_ultima_revisao IS DISTINCT FROM OLD.data_ultima_revisao OR
     NEW.u_revisao         IS DISTINCT FROM OLD.u_revisao        OR
     NEW.h_revisao         IS DISTINCT FROM OLD.h_revisao        OR
     NEW.proxima_revisao_horimetro IS DISTINCT FROM OLD.proxima_revisao_horimetro OR
     NEW.hr_rodado         IS DISTINCT FROM OLD.hr_rodado        OR
     NEW.status            IS DISTINCT FROM OLD.status           OR
     NEW.modelo            IS DISTINCT FROM OLD.modelo           OR
     NEW.cover_storage_path IS DISTINCT FROM OLD.cover_storage_path
  THEN
    RAISE EXCEPTION 'Colaborador só pode alterar horímetro, observações, filtros e lubrificantes';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$;
