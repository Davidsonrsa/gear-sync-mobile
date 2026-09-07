
REVOKE EXECUTE ON FUNCTION public.can_view_notas_fiscais() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_notas_fiscais() FROM anon;
REVOKE EXECUTE ON FUNCTION public.gerar_notificacoes_tacografos() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gerar_notificacoes_tacografos() FROM authenticated;
