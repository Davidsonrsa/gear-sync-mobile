CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;

ALTER POLICY equip_delete_admin ON public.equipamentos
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY equip_insert_admin ON public.equipamentos
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY mh_delete_owner_or_admin ON public.manutencao_historico
USING ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY mh_update_owner_or_admin ON public.manutencao_historico
USING ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY profiles_select_self_or_admin ON public.profiles
USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY profiles_update_self_or_admin ON public.profiles
USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY user_roles_select_self_or_admin ON public.user_roles
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.equipamentos_enforce_field_perms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin') THEN
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    RETURN NEW;
  END IF;

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
     NEW.motor_oleo        IS DISTINCT FROM OLD.motor_oleo       OR
     NEW.hidraulico_oleo   IS DISTINCT FROM OLD.hidraulico_oleo  OR
     NEW.transmissao_oleo  IS DISTINCT FROM OLD.transmissao_oleo OR
     NEW.eixo_oleo         IS DISTINCT FROM OLD.eixo_oleo        OR
     NEW.tandem_oleo       IS DISTINCT FROM OLD.tandem_oleo      OR
     NEW.filtro_lub        IS DISTINCT FROM OLD.filtro_lub       OR
     NEW.filtro_diesel_p   IS DISTINCT FROM OLD.filtro_diesel_p  OR
     NEW.filtro_diesel_s   IS DISTINCT FROM OLD.filtro_diesel_s  OR
     NEW.filtro_sep_agua   IS DISTINCT FROM OLD.filtro_sep_agua  OR
     NEW.filtro_ar_ext     IS DISTINCT FROM OLD.filtro_ar_ext    OR
     NEW.filtro_ar_int     IS DISTINCT FROM OLD.filtro_ar_int    OR
     NEW.filtro_trans      IS DISTINCT FROM OLD.filtro_trans     OR
     NEW.filtro_hidr       IS DISTINCT FROM OLD.filtro_hidr      OR
     NEW.filtro_respiro    IS DISTINCT FROM OLD.filtro_respiro   OR
     NEW.filtro_ar_cond1   IS DISTINCT FROM OLD.filtro_ar_cond1  OR
     NEW.filtro_ar_cond2   IS DISTINCT FROM OLD.filtro_ar_cond2
  THEN
    RAISE EXCEPTION 'Colaborador só pode alterar horímetro atual, data e observações';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$;