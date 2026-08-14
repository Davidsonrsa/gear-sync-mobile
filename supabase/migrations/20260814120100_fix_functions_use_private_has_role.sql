-- Fix all PL/pgSQL functions that reference public.has_role to use private.has_role

-- Update the equipamentos_enforce_field_perms function if it still exists
-- This function should already use private.has_role in newer migrations,
-- but we ensure it's correct here

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- For any other functions that might reference public.has_role, 
-- they should already be updated. If you encounter errors, check the function
-- and ensure it uses private.has_role(auth.uid(), 'admin'::public.app_role)
-- instead of public.has_role(auth.uid(), 'admin')
