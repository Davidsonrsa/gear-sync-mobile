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
    <div className="min-h-screen bg-slate-50">
      <header 
        className="fixed top-0 left-0 right-0 z-50 text-white shadow-lg w-full"
        style={{ backgroundColor: "#11386f" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ backgroundColor: "#11386f" }}>
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <img 
                src={LOGO_URL} 
                alt="GIF Logo" 
                className="h-12 w-12 rounded-lg object-cover bg-white p-0.5 shadow shrink-0" 
              />
              <div>
                <h1 className="text-base md:text-lg font-bold tracking-tight text-white leading-tight">
                  GIF - Gestão Integrada de Frotas
                </h1>
                <p className="text-xs text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium text-white">{fullName || "Usuário"}</span>
                  <Badge variant="outline" className="text-[10px] border-slate-400 text-white bg-black/30 px-1.5 py-0">
                    {isAdmin ? "Admin" : "Colaborador"}
                  </Badge>
                </p>
              </div>
            </div>

            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleLogout} 
              className="text-white hover:bg-white/20 hover:text-white md:hidden"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <nav className="flex items-center gap-1.5">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap text-slate-100 hover:bg-white/20 hover:text-white transition-colors [&.active]:bg-white [&.active]:text-[#11386f] [&.active]:shadow"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              ))}
            </nav>

            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleLogout} 
              className="hidden md:flex text-white hover:bg-white/20 hover:text-white gap-1.5 shrink-0 border border-white/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </Button>
          </div>

        </div>
      </header>

      <main className="pt-28 md:pt-20">
        <Outlet />
      </main>
    </div>
  );
}
