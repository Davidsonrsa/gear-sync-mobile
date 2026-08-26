import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PlusCircle, Users, Truck, Upload, Trash2, Key } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    
    // Verifica se é admin na tabela profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .single();

    if (!profile?.is_admin) {
      throw redirect({ to: "/equipamentos" });
    }
    return { user: data.user };
  },
  component: AdminPage,
});

function AdminPage() {
  const { toast } = useToast();
  
  // Estados para Novo Equipamento
  const [eqNumero, setEqNumero] = useState("");
  const [eqClasse, setEqClasse] = useState("");
  const [eqIdentificacao, setEqIdentificacao] = useState("");
  const [eqPlaca, setEqPlaca] = useState("");
  const [eqAno, setEqAno] = useState("");
  const [eqLocalizacao, setEqLocalizacao] = useState("");
  const [loadingEq, setLoadingEq] = useState(false);

  // Estados para Novo Usuário
  const [userName, setUserName] = useState("");
  const [userMatricula, setUserMatricula] = useState("");
  const [userTelefone, setUserTelefone] = useState("");
  const [userSenha, setUserSenha] = useState("");
  const [userPerfil, setUserPerfil] = useState("colaborador");
  const [loadingUser, setLoadingUser] = useState(false);

  async function handleCreateEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!eqNumero) {
      toast({ title: "Preencha o número do equipamento", variant: "destructive" });
      return;
    }

    setLoadingEq(true);
    try {
      const { error } = await supabase.from("equipamentos").insert({
        numero: eqNumero,
        classe: eqClasse,
        identificacao: eqIdentificacao,
        placa: eqPlaca,
        ano: eqAno ? parseInt(eqAno) : null,
        localizacao: eqLocalizacao,
        status: "Operacional",
      });

      if (error) throw error;

      toast({ title: "Equipamento criado com sucesso!" });
      setEqNumero("");
      setEqClasse("");
      setEqIdentificacao("");
      setEqPlaca("");
      setEqAno("");
      setEqLocalizacao("");
    } catch (err: any) {
      toast({ title: "Erro ao criar equipamento", description: err.message, variant: "destructive" });
    } finally {
      setLoadingEq(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !userMatricula || !userSenha) {
      toast({ title: "Preencha os campos obrigatórios (*)", variant: "destructive" });
      return;
    }

    setLoadingUser(true);
    try {
      // Simulação de criação de usuário vinculado à matrícula
      const fakeEmail = `${userMatricula.toLowerCase().trim()}@gif.local`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: userSenha,
        options: {
          data: {
            full_name: userName,
            matricula: userMatricula,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          full_name: userName,
          matricula: userMatricula,
          telefone: userTelefone,
          is_admin: userPerfil === "admin",
        });

        if (profileError) throw profileError;
      }

      toast({ title: "Colaborador cadastrado com sucesso!" });
      setUserName("");
      setUserMatricula("");
      setUserTelefone("");
      setUserSenha("");
      setUserPerfil("colaborador");
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar usuário", description: err.message, variant: "destructive" });
    } finally {
      setLoadingUser(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Painel Administrativo</h1>
        <p className="text-sm text-slate-500">Gerenciamento de frota, cadastros e acessos do sistema.</p>
      </div>

      <Tabs defaultValue="equipamentos" className="w-full">
        <TabsList className="grid w-full grid-max max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="equipamentos" className="flex items-center gap-2 font-bold">
            <Truck className="w-4 h-4" />
            Equipamentos
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2 font-bold">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        {/* ABA DE EQUIPAMENTOS */}
        <TabsContent value="equipamentos" className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-slate-800" />
              Novo equipamento
            </h2>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Nº *</Label>
                  <Input
                    value={eqNumero}
                    onChange={(e) => setEqNumero(e.target.value)}
                    placeholder="Ex: RE-14"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Classe</Label>
                  <Input
                    value={eqClasse}
                    onChange={(e) => setEqClasse(e.target.value)}
                    placeholder="Ex: CL 09"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Identificação</Label>
                  <Input
                    value={eqIdentificacao}
                    onChange={(e) => setEqIdentificacao(e.target.value)}
                    placeholder="Descrição do equipamento"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Placa</Label>
                  <Input
                    value={eqPlaca}
                    onChange={(e) => setEqPlaca(e.target.value)}
                    placeholder="Ex: ABC-1234"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Ano</Label>
                  <Input
                    type="number"
                    value={eqAno}
                    onChange={(e) => setEqAno(e.target.value)}
                    placeholder="Ex: 2024"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Localização</Label>
                  <Input
                    value={eqLocalizacao}
                    onChange={(e) => setEqLocalizacao(e.target.value)}
                    placeholder="Ex: Pref. Ipatinga"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Botão com estilo forçado visível em preto/branco */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loadingEq}
                  className="w-full md:w-auto px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  style={{ backgroundColor: "#0f172a !important", color: "#ffffff !important" }}
                >
                  {loadingEq ? "Salvando..." : "Criar equipamento"}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Os demais campos podem ser preenchidos depois na tela do equipamento.
              </p>
            </form>
          </div>
        </TabsContent>

        {/* ABA DE USUÁRIOS */}
        <TabsContent value="usuarios" className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-800" />
              Cadastrar usuário
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Nome completo *</Label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Nome do colaborador"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Matrícula *</Label>
                  <Input
                    value={userMatricula}
                    onChange={(e) => setUserMatricula(e.target.value)}
                    placeholder="Ex: 12345"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Telefone</Label>
                  <Input
                    value={userTelefone}
                    onChange={(e) => setUserTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Senha inicial *</Label>
                  <Input
                    type="password"
                    value={userSenha}
                    onChange={(e) => setUserSenha(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Perfil *</Label>
                  <Select value={userPerfil} onValueChange={setUserPerfil}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botão com estilo forçado visível em preto/branco */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loadingUser}
                  className="w-full md:w-auto px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  style={{ backgroundColor: "#0f172a !important", color: "#ffffff !important" }}
                >
                  {loadingUser ? "Cadastrando..." : "Criar colaborador"}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                O usuário fará login com a <strong>matrícula</strong> e a senha definida aqui. Administradores terão acesso ao painel administrativo.
              </p>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
