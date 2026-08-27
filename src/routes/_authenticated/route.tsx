import { createFileRoute, redirect, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, DollarSign, FileText, Settings, LogOut } from "lucide-react";

const LOGO_URL = "/__l5e/assets-v1/c991d251-7ee8-44d3-b8b2-4094df040c16/logo-sph.jpg";

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

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const navItems = [
    { to: "/equipamentos", label: "Frota", icon: Truck, show: true },
    { to: "/custos", label: "Custos", icon: DollarSign, show: true },
    {
      to: "/notas-fiscais",
      label: "Notas Fiscais",
      icon: FileText,
      show: isAdmin || notasFiscais.autorizado,
    },
    { to: "/admin", label: "Admin", icon: Settings, show: isAdmin },
  ].filter((i) => i.show);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-2.5 flex items-center gap-3">
          <img src={LOGO_URL} alt="SPH Tecnologia" className="h-9 w-9 rounded-md object-cover" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold text-black truncate">
              Controle de Horímetros
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {fullName || "Usuário"}{" "}
              <Badge variant={isAdmin ? "default" : "secondary"} className="ml-1 text-[10px]">
                {isAdmin ? "Admin" : "Colaborador"}
              </Badge>
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="gap-1.5">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>

        <nav className="max-w-7xl mx-auto px-3 md:px-6 pb-2 flex gap-1.5 overflow-x-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap text-slate-600 hover:bg-slate-100 transition-colors [&.active]:bg-blue-600 [&.active]:text-white"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
