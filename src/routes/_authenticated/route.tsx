import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Settings, List, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { isAdmin, fullName, notasFiscais } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  // 1. Correção com Optional Chaining (?.): previne erro de JS se notasFiscais for undefined
  const canAccessNotasFiscais = isAdmin || Boolean(notasFiscais?.autorizado);
  
  const isCustosRoute = loc.pathname.startsWith("/custos");
  const isAdminRoute = loc.pathname.startsWith("/admin");
  const isNotasRoute = loc.pathname.startsWith("/notas-fiscais");

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // 2. Cálculo dinâmico de colunas para o menu mobile
  const mobileColsCount =
    1 + // Equipamentos
    (canAccessNotasFiscais ? 1 : 0) + // Notas Fiscais
    1 + // Custos
    (isAdmin ? 1 : 0); // Admin

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-20 md:pb-8">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div
          className="px-4 py-3 flex items-center gap-3 md:max-w-7xl md:mx-auto md:w-full md:px-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src="/logo SPX MAFRA JHM.png"
              alt="SPH JHM Mafra"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-lg font-bold leading-tight truncate">
              GIF - Gestão Integrada de Frotas
            </h1>
            <p className="text-[11px] md:text-xs opacity-80 truncate">
              {fullName || "—"} · {isAdmin ? "Admin" : "Colaborador"}
            </p>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            <Link
              to="/equipamentos"
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !isAdminRoute && !isNotasRoute && !isCustosRoute
                  ? "bg-primary-foreground/15"
                  : "hover:bg-primary-foreground/10"
              }`}
            >
              <List className="w-4 h-4" />
              Equipamentos
            </Link>

            {canAccessNotasFiscais && (
              <Link
                to="/notas-fiscais"
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isNotasRoute
                    ? "bg-primary-foreground/15"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                <FileText className="w-4 h-4" />
                Notas Fiscais
              </Link>
            )}

            <Link
              to="/custos"
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isCustosRoute
                  ? "bg-primary-foreground/15"
                  : "hover:bg-primary-foreground/10"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Custos
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isAdminRoute
                    ? "bg-primary-foreground/15"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile nav com grid adaptável */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${mobileColsCount}, minmax(0, 1fr))` }}
        >
          <Link
            to="/equipamentos"
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              !isAdminRoute && !isNotasRoute && !isCustosRoute
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <List className="w-5 h-5" />
            Equipamentos
          </Link>

          {canAccessNotasFiscais && (
            <Link
              to="/notas-fiscais"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isNotasRoute ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <FileText className="w-5 h-5" />
              Notas Fiscais
            </Link>
          )}

          <Link
            to="/custos"
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isCustosRoute ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Custos
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isAdminRoute ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Settings className="w-5 h-5" />
              Admin
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
