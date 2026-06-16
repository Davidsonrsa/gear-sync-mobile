import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Gauge } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Controle de Horímetros" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "first">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/equipamentos", replace: true });
    });
    // Detecta se ainda não existe nenhum usuário
    supabase.from("user_roles").select("user_id", { count: "exact", head: true })
      .then(({ count, error }) => {
        // Se anon não conseguir ler (RLS), assumimos que já existe alguém
        if (!error && (count ?? 0) === 0) {
          setNeedsFirstAdmin(true);
          setMode("first");
        }
      });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/equipamentos", replace: true });
  }

  async function handleFirstAdmin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    // tenta login imediato (auto_confirm ativo)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInErr) return toast.error(signInErr.message);
    toast.success("Conta de administrador criada!");
    navigate({ to: "/equipamentos", replace: true });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-primary/90 to-primary text-primary-foreground">
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-6 bg-card text-card-foreground shadow-2xl">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Gauge className="w-9 h-9 text-accent" />
            </div>
            <h1 className="text-xl font-bold text-center">Controle de Horímetros</h1>
            <p className="text-xs text-muted-foreground text-center">
              {mode === "first" ? "Crie a conta do primeiro administrador" : "Acesso restrito aos colaboradores"}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              {needsFirstAdmin && (
                <button type="button" onClick={() => setMode("first")} className="w-full text-xs text-primary underline">
                  Primeiro acesso: criar conta de admin
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleFirstAdmin} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="password">Senha (mín. 8)</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 text-base bg-accent text-accent-foreground hover:bg-accent/90">
                {loading ? "Criando..." : "Criar conta de admin"}
              </Button>
              <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-muted-foreground">
                Já tenho conta — fazer login
              </button>
            </form>
          )}
          <p className="mt-6 text-[11px] text-muted-foreground text-center">
            {mode === "login" ? "Não possui acesso? Solicite o cadastro ao administrador." : "Esta opção só está disponível enquanto não houver nenhum usuário cadastrado."}
          </p>
        </Card>
      </div>
    </div>
  );
}
