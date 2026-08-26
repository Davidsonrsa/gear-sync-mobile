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
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div
          className="px-4 py-3 flex items-center gap-3 md:max-w-7xl md:mx-auto md:w-full md:px-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          {/* Logo */}
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
            <img
              src="/logo SPX MAFRA JHM.png"
              alt="SPH JHM Mafra"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Nome e Perfil */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold leading-tight truncate text-slate-900">
              GIF - Gestão Integrada de Frotas
            </h1>
            <p className="text-[11px] md:text-xs text-slate-500 truncate font-semibold">
              {fullName || "—"} · {isAdmin ? "Admin" : "Colaborador"}
            </p>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-2 shrink-0">
            {/* EQUIPAMENTOS */}
            <Link
              to="/equipamentos"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-extrabold tracking-wide border-2 transition-all"
              style={{
                backgroundColor: isEquipamentosRoute ? "#0f172a" : "#ffffff",
                borderColor: "#0f172a",
                color: isEquipamentosRoute ? "#ffffff" : "#0f172a",
              }}
            >
              <List
                className="w-4 h-4 shrink-0"
                style={{ color: isEquipamentosRoute ? "#ffffff" : "#0f172a" }}
              />
              <span style={{ color: isEquipamentosRoute ? "#ffffff" : "#0f172a" }}>
                EQUIPAMENTOS
              </span>
            </Link>

            {/* NOTAS FISCAIS */}
            {canAccessNotasFiscais && (
              <Link
                to="/notas-fiscais"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-extrabold tracking-wide border-2 transition-all"
                style={{
                  backgroundColor: isNotasRoute ? "#0f172a" : "#ffffff",
                  borderColor: "#0f172a",
                  color: isNotasRoute ? "#ffffff" : "#0f172a",
                }}
              >
                <FileText
                  className="w-4 h-4 shrink-0"
                  style={{ color: isNotasRoute ? "#ffffff" : "#0f172a" }}
                />
                <span style={{ color: isNotasRoute ? "#ffffff" : "#0f172a" }}>
                  NOTAS FISCAIS
                </span>
              </Link>
            )}

            {/* CONTROLE DE CUSTOS */}
            <Link
              to="/custos"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-extrabold tracking-wide border-2 transition-all"
              style={{
                backgroundColor: isCustosRoute ? "#0f172a" : "#ffffff",
                borderColor: "#0f172a",
                color: isCustosRoute ? "#ffffff" : "#0f172a",
              }}
            >
              <DollarSign
                className="w-4 h-4 shrink-0"
                style={{ color: isCustosRoute ? "#ffffff" : "#0f172a" }}
              />
              <span style={{ color: isCustosRoute ? "#ffffff" : "#0f172a" }}>
                CONTROLE DE CUSTOS
              </span>
            </Link>

            {/* ADMIN */}
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-extrabold tracking-wide border-2 transition-all"
                style={{
                  backgroundColor: isAdminRoute ? "#0f172a" : "#ffffff",
                  borderColor: "#0f172a",
                  color: isAdminRoute ? "#ffffff" : "#0f172a",
                }}
              >
                <Settings
                  className="w-4 h-4 shrink-0"
                  style={{ color: isAdminRoute ? "#ffffff" : "#0f172a" }}
                />
                <span style={{ color: isAdminRoute ? "#ffffff" : "#0f172a" }}>
                  ADMIN
                </span>
              </Link>
            )}
          </nav>

          {/* Botão Sair Nativo (garante visibilidade do ícone) */}
          <button
            type="button"
            onClick={handleSignOut}
            title="Sair"
            className="w-9 h-9 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center hover:bg-red-50 hover:border-red-600 transition-colors shrink-0"
            style={{ borderColor: "#0f172a", backgroundColor: "#ffffff" }}
          >
            <LogOut className="w-4 h-4" style={{ color: "#0f172a", stroke: "#0f172a" }} />
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Menu Mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${mobileColsCount}, minmax(0, 1fr))` }}
        >
          <Link
            to="/equipamentos"
            className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          >
            <List className="w-5 h-5" style={{ color: isEquipamentosRoute ? "#0f172a" : "#64748b" }} />
            <span
              className="text-[10px] uppercase tracking-wider leading-none"
              style={{
                color: isEquipamentosRoute ? "#0f172a" : "#64748b",
                fontWeight: isEquipamentosRoute ? 900 : 600,
              }}
            >
              EQUIPAMENTOS
            </span>
          </Link>

          {canAccessNotasFiscais && (
            <Link
              to="/notas-fiscais"
              className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            >
              <FileText className="w-5 h-5" style={{ color: isNotasRoute ? "#0f172a" : "#64748b" }} />
              <span
                className="text-[10px] uppercase tracking-wider leading-none"
                style={{
                  color: isNotasRoute ? "#0f172a" : "#64748b",
                  fontWeight: isNotasRoute ? 900 : 600,
                }}
              >
                NOTAS FISCAIS
              </span>
            </Link>
          )}

          <Link
            to="/custos"
            className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          >
            <DollarSign className="w-5 h-5" style={{ color: isCustosRoute ? "#0f172a" : "#64748b" }} />
            <span
              className="text-[10px] uppercase tracking-wider leading-none text-center"
              style={{
                color: isCustosRoute ? "#0f172a" : "#64748b",
                fontWeight: isCustosRoute ? 900 : 600,
              }}
            >
              CUSTOS
            </span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            >
              <Settings className="w-5 h-5" style={{ color: isAdminRoute ? "#0f172a" : "#64748b" }} />
              <span
                className="text-[10px] uppercase tracking-wider leading-none"
                style={{
                  color: isAdminRoute ? "#0f172a" : "#64748b",
                  fontWeight: isAdminRoute ? 900 : 600,
                }}
              >
                ADMIN
              </span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
