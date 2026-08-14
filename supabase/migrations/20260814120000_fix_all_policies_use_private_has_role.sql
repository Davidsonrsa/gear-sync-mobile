-- Fix all policies to use private.has_role instead of public.has_role
-- This resolves "permission denied for function has_role" errors

-- Update all RLS policies that reference public.has_role to use private.has_role

-- Profiles policies
ALTER POLICY profiles_select_self_or_admin ON public.profiles
USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY profiles_update_self_or_admin ON public.profiles
USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- User roles policies
ALTER POLICY user_roles_select_self_or_admin ON public.user_roles
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY user_roles_insert_admin ON public.user_roles
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Equipment fotos policies
ALTER POLICY fotos_select_all ON storage.objects
USING (bucket_id = 'equipamento-fotos');

ALTER POLICY fotos_insert_owner_or_admin ON storage.objects
WITH CHECK (
  bucket_id = 'equipamento-fotos'
  AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
);

ALTER POLICY fotos_delete_owner_or_admin ON storage.objects
USING (
  bucket_id = 'equipamento-fotos'
  AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Equipamentos policies (if they still use public.has_role, this is already handled in 20260623122544)
-- But let's ensure they're correct
ALTER POLICY equip_select_all ON public.equipamentos
USING (true);

ALTER POLICY equip_delete_admin ON public.equipamentos
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY equip_insert_admin ON public.equipamentos
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY equip_update_all ON public.equipamentos
USING (true);

-- Equipamento fotos table policies
ALTER POLICY ef_select_all ON public.equipamento_fotos
USING (true);

ALTER POLICY ef_insert_all ON public.equipamento_fotos
WITH CHECK (true);

ALTER POLICY ef_delete_owner_or_admin ON public.equipamento_fotos
USING ((uploaded_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));
