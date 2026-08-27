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
  const { isAdmin, fullName } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const navItems = [
    { to: "/equipamentos", label: "Frota", icon: Truck },
    { to: "/custos", label: "Custos", icon: DollarSign },
    { to: "/notas-fiscais", label: "Notas Fiscais", icon: FileText },
    { to: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header 
        className="fixed top-0 left-0 right-0 z-50 text-white shadow-lg w-full"
        style={{ backgroundColor: "#11386f" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Logo e Título */}
          <div className="flex items-center space-x-3 shrink-0">
            <img 
              src={LOGO_URL} 
              alt="GIF Logo" 
              className="h-10 w-10 rounded-lg object-cover bg-white p-0.5 shadow" 
            />
            <div>
              <h1 className="text-sm md:text-base font-bold tracking-tight text-white leading-tight">
                GIF - Gestão Integrada de Frotas
              </h1>
              <p className="text-[11px] text-slate-200 flex items-center gap-1.5">
                <span className="font-medium text-white">{fullName || "Usuário"}</span>
                <Badge variant="outline" className="text-[9px] border-slate-400 text-white bg-black/30 px-1 py-0">
                  {isAdmin ? "Admin" : "Colaborador"}
                </Badge>
              </p>
            </div>
          </div>

          {/* Centro: Menu de navegação fixo e alinhado */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap text-slate-100 hover:bg-white/20 hover:text-white transition-colors [&.active]:bg-white [&.active]:text-[#11386f] [&.active]:shadow"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Lado Direito: Botão Sair */}
          <div className="shrink-0">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleLogout} 
              className="text-white hover:bg-white/20 hover:text-white gap-1.5 border border-white/20 text-xs h-8 px-2.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>

        </div>
      </header>

      <main className="pt-20">
        <Outlet />
      </main>
    </div>
  );
}
