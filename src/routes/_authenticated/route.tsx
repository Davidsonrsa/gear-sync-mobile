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

  const canAccessNotasFiscais = isAdmin || Boolean(notasFiscais?.autorizado);

  const isCustosRoute = loc.pathname.startsWith("/custos");
  const isAdminRoute = loc.pathname.startsWith("/admin");
  const isNotasRoute = loc.pathname.startsWith("/notas-fiscais");
  const isEquipamentosRoute = !isAdminRoute && !isNotasRoute && !isCustosRoute;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const mobileColsCount =
    1 + // Equipamentos
    (canAccessNotasFiscais ? 1 : 0) + // Notas Fiscais
    1 + // Custos
    (isAdmin ? 1 : 0); // Admin

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-20 md:pb-8">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div
          className="px-4 py-3 flex items-center gap-4 md:max-w-7xl md:mx-auto md:w-full md:px-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          {/* Logo */}
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
            <img
              src="/logo SPX MAFRA JHM.png"
              alt="SPH JHM Mafra"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Título do App */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold leading-tight truncate text-gray-900">
              GIF - Gestão Integrada de Frotas
            </h1>
            <p className="text-[11px] md:text-xs text-gray-500 truncate font-medium">
              {fullName || "—"} · {isAdmin ? "Admin" : "Colaborador"}
            </p>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 shrink-0">
            {/* Botão EQUIPAMENTOS */}
            <Link
              to="/equipamentos"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold tracking-wide border-2 transition-all ${
                isEquipamentosRoute
                  ? "bg-white text-gray-900 border-gray-300 shadow-md scale-105"
                  : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm"
              }`}
            >
              <List className="w-4 h-4" />
              <span>EQUIPAMENTOS</span>
            </Link>

            {/* Botão NOTAS FISCAIS */}
            {canAccessNotasFiscais && (
              <Link
                to="/notas-fiscais"
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold tracking-wide border-2 transition-all ${
                  isNotasRoute
                    ? "bg-white text-gray-900 border-gray-300 shadow-md scale-105"
                    : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>NOTAS FISCAIS</span>
              </Link>
            )}

            {/* Botão CONTROLE DE CUSTOS */}
            <Link
              to="/custos"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold tracking-wide border-2 transition-all ${
                isCustosRoute
                  ? "bg-white text-gray-900 border-gray-300 shadow-md scale-105"
                  : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>CONTROLE DE CUSTOS</span>
            </Link>

            {/* Botão ADMIN */}
            {isAdmin && (
              <Link
                to="/admin"
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold tracking-wide border-2 transition-all ${
                  isAdminRoute
                    ? "bg-white text-gray-900 border-gray-300 shadow-md scale-105"
                    : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>ADMIN</span>
              </Link>
            )}
          </nav>

          {/* Botão Sair */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50 shrink-0 border border-gray-200 rounded-xl"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${mobileColsCount}, minmax(0, 1fr))` }}
        >
          <Link
            to="/equipamentos"
            className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
              isEquipamentosRoute
                ? "text-blue-600 font-extrabold"
                : "text-gray-500 font-medium hover:text-gray-900"
            }`}
          >
            <List className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-wider leading-none">EQUIPAMENTOS</span>
          </Link>

          {canAccessNotasFiscais && (
            <Link
              to="/notas-fiscais"
              className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isNotasRoute
                  ? "text-blue-600 font-extrabold"
                  : "text-gray-500 font-medium hover:text-gray-900"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider leading-none">NOTAS FISCAIS</span>
            </Link>
          )}

          <Link
            to="/custos"
            className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
              isCustosRoute
                ? "text-blue-600 font-extrabold"
                : "text-gray-500 font-medium hover:text-gray-900"
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-wider leading-none text-center">
              CUSTOS
            </span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isAdminRoute
                  ? "text-blue-600 font-extrabold"
                  : "text-gray-500 font-medium hover:text-gray-900"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider leading-none">ADMIN</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
