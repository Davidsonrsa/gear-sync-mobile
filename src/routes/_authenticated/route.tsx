import { createFileRoute, redirect, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, DollarSign, FileText, Settings, LogOut } from "lucide-react";

// Substitua pelo caminho ou URL da sua logo antiga original
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
  const useNavigateInstance = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    useNavigateInstance({ to: "/auth" });
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
    <div className="min-h-screen pt-2">
      {/* Barra Fixa com Tonalidade Azul Solida */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Esquerda: Logo Maior e Título Atualizado */}
          <div className="flex items-center space-x-3">
            <img 
              src={LOGO_URL} 
              alt="GIF Logo" 
              className="h-12 w-12 rounded-md object-contain bg-white p-0.5 shadow" 
            />
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-wide text-white">
                GIF - Gestão Integrada de Frotas
              </h1>
              <p className="text-xs text-blue-100 flex items-center gap-1.5">
                <span>{fullName || "Usuário"}</span>
                <Badge variant="outline" className="text-[10px] border-blue-300 text-white px-1.5 py-0">
                  {isAdmin ? "Admin" : "Colaborador"}
                </Badge>
              </p>
            </div>
          </div>

          {/* Direita: Botão Sair */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleLogout} 
            className="text-white hover:bg-blue-700 hover:text-white gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>

        {/* Barra de Navegação Interna Alinhada */}
        <div className="bg-blue-700/50 border-t border-blue-500/40">
          <nav className="max-w-7xl mx-auto px-4 py-1.5 flex gap-2 overflow-x-auto">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap text-blue-100 hover:bg-blue-600 hover:text-white transition-colors [&.active]:bg-white [&.active]:text-blue-900 shadow-sm"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Espaçamento para o conteúdo não ficar debaixo da barra fixa */}
      <main className="pt-28">
        <Outlet />
      </main>
    </div>
  );
}
