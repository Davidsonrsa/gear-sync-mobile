import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Settings, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-sph.jpg.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAdmin, fullName } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isAdminRoute = loc.pathname.startsWith("/admin");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-20">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div className="px-4 py-3 flex items-center gap-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
          <div className="w-9 h-9 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
            <img src={logo.url} alt="SPH JHM Mafra" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">Controle de Horímetros</h1>
            <p className="text-[11px] opacity-80 truncate">{fullName || "—"} · {isAdmin ? "Admin" : "Colaborador"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-2 max-w-md mx-auto">
          <Link to="/equipamentos" className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${!isAdminRoute ? "text-primary" : "text-muted-foreground"}`}>
            <List className="w-5 h-5" />
            Equipamentos
          </Link>
          {isAdmin && (
            <Link to="/admin" className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${isAdminRoute ? "text-primary" : "text-muted-foreground"}`}>
              <Settings className="w-5 h-5" />
              Admin
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
