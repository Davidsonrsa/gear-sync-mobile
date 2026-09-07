
REVOKE EXECUTE ON FUNCTION public.can_view_notas_fiscais() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_notas_fiscais() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gerar_notificacoes_tacografos() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_notas_fiscais() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_notas_fiscais() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_notificacoes_tacografos() TO service_role;
