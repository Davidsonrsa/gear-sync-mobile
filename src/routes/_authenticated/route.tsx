import { createFileRoute, redirect, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, DollarSign, FileText, Settings, LogOut } from "lucide-react";

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
          className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 w-full"
          style={{ backgroundColor: "#33859c" }}
        >
          
        <div className="flex items-center space-x-3.5 shrink-0">
          <img 
            src="/logo%20SPX%20MAFRA%20JHM.png" 
            alt="SPH JHM Mafra" 
            className="h-12 w-12 rounded-lg object-contain shadow-sm shrink-0 bg-white opacity-100 !opacity-100" 
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

          <nav className="flex items-center gap-1.5 overflow-x-auto py-1 bg-transparent">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap text-black bg-transparent hover:bg-black/10 transition-colors [&.active]:bg-black/25 [&.active]:text-black [&.active]:shadow-none"
              >
                <Icon className="w-4 h-4 text-black" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="shrink-0">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleLogout} 
              className="text-white hover:bg-white/20 gap-1.5 text-xs h-8 px-2.5 font-bold"
            >
              <LogOut className="w-4 h-4 text-white" />
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
