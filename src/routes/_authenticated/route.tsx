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
        className="fixed top-0 left-0 right-0 z-50 shadow-md w-full"
        style={{ backgroundColor: "#33859c" }}
      >
        <div 
          className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 w-full"
          style={{ backgroundColor: "#33859c" }}
        >
          
          <div className="flex items-center space-x-3 shrink-0">
            <img 
              src={LOGO_URL} 
              alt="GIF Logo" 
              className="h-11 w-11 rounded-lg object-cover bg-white p-0.5 shadow-sm shrink-0" 
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-black leading-tight">
                GIF - Gestão Integrada de Frotas
              </h1>
              <p className="text-[11px] text-black/90 flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-black">{fullName || "Usuário"}</span>
                <Badge variant="outline" className="text-[9px] border-black/40 text-black bg-white/40 px-1 py-0 font-bold">
                  {isAdmin ? "Admin" : "Colaborador"}
                </Badge>
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap text-black hover:bg-black/10 transition-colors [&.active]:bg-white [&.active]:text-black [&.active]:shadow-sm"
              >
                <Icon className="w-3.5 h-3.5 text-black" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="shrink-0">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleLogout} 
              className="text-black hover:bg-black/10 hover:text-black gap-1.5 border border-black/20 text-xs h-8 px-2.5 font-bold bg-transparent"
            >
              <LogOut className="w-3.5 h-3.5 text-black" />
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
