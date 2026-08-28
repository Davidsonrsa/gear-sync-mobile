import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { matToEmail } from "@/lib/mat";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — GIF - Gestão Integrada de Frotas" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mat, setMat] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/equipamentos", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!mat.trim()) return toast.error("Informe sua matrícula");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: matToEmail(mat), password });
    setLoading(false);
    if (error) return toast.error("Matrícula ou senha incorreta");
    toast.success("Bem-vindo!");
    navigate({ to: "/equipamentos", replace: true });
  }

  return (
    /* Fundo geral azul escuro */
    <div className="min-h-[100dvh] flex flex-col bg-[#0d47a1] text-slate-900 justify-center items-center p-4">
      <Card className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-2xl border-0">
        <div className="flex flex-col items-center gap-2 mb-6">
    <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center overflow-hidden border border-slate-100">
  <img
    src="/logo-sph.jpg"
    alt="SPH JHM Mafra"
    className="w-full h-full object-contain opacity-100 !opacity-100"
  />
</div>
          <h1 className="text-base font-bold text-center text-slate-900">GIF - Gestão Integrada de Frotas</h1>
          <p className="text-xs text-slate-500 text-center">
            Acesso restrito aos colaboradores
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="mat" className="text-xs font-semibold text-slate-700">Matrícula</Label>
            <Input
              id="mat"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="username"
              required
              value={mat}
              onChange={(e) => setMat(e.target.value)}
              className="mt-1 uppercase text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-blue-600 h-10"
              placeholder="EX: 12345"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Senha</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-blue-600 h-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botão com fundo azul escuro corporativo */}
          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full h-11 text-sm font-semibold !bg-[#003b73] !text-white hover:!bg-[#002d59] transition-colors rounded-lg shadow-sm mt-2"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-5 text-[11px] text-slate-400 text-center">
          Sem acesso? Peça sua matrícula ao administrador.
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            📱 Para instalar no celular: abra este link no <b>Chrome</b> (Android) ou{" "}
            <b>Safari</b> (iPhone) e use <b>"Adicionar à tela inicial"</b>.
          </p>
        </div>
      </Card>
    </div>
  );
}
