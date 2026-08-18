import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "colaborador";

export interface NotasFiscaisPermissoes {
  visualizar: boolean;
  gerenciar: boolean;
}

export interface AuthState {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  role: AppRole | null;
  isAdmin: boolean;
  fullName: string;
  notasFiscais: NotasFiscaisPermissoes & { autorizado: boolean };
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [notasFiscaisPerms, setNotasFiscaisPerms] = useState<NotasFiscaisPermissoes & { autorizado: boolean }>({
    visualizar: false,
    gerenciar: false,
    autorizado: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) {
      setRole(null);
      setFullName("");
      setNotasFiscaisPerms({ visualizar: false, gerenciar: false, autorizado: false });
      return;
    }
    (async () => {
      const [{ data: roles }, { data: prof }, { data: nfPerms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
        supabase.from("notas_fiscais_permissoes").select("visualizar,gerenciar").eq("user_id", uid).maybeSingle(),
      ]);
      const isAdmin = roles?.some((r) => r.role === "admin");
      setRole(isAdmin ? "admin" : "colaborador");
      setFullName(prof?.full_name ?? "");
      
      // Permissões Notas Fiscais
      const nfPermission = nfPerms as NotasFiscaisPermissoes | null;
      setNotasFiscaisPerms({
        visualizar: nfPermission?.visualizar ?? false,
        gerenciar: nfPermission?.gerenciar ?? false,
        autorizado: (nfPermission?.visualizar ?? false) || (nfPermission?.gerenciar ?? false),
      });
    })();
  }, [session?.user.id]);

  return {
    loading,
    session,
    userId: session?.user.id ?? null,
    role,
    isAdmin: role === "admin",
    fullName,
    notasFiscais: notasFiscaisPerms,
  };
}
