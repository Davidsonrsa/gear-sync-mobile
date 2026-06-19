import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { adminCreateUser, adminListUsers, adminDeleteUser } from "@/lib/admin.functions";
import { toast } from "sonner";
import { UserPlus, Plus, Trash2, ShieldCheck, User } from "lucide-react";
import { ImportEquipamentos } from "@/components/ImportEquipamentos";
import { emailToMat } from "@/lib/mat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }
  return (
    <div className="px-3 py-3 max-w-md mx-auto w-full">
      <Tabs defaultValue="equipamentos">
        <TabsList className="grid grid-cols-2 w-full mb-3">
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="equipamentos" className="space-y-3">
          <ImportEquipamentos />
          <NewEquipamento />
        </TabsContent>
        <TabsContent value="usuarios">
          <Usuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewEquipamento() {
  const qc = useQueryClient();
  const [f, setF] = useState({
    numero: "",
    identificacao: "",
    placa: "",
    ano: "",
    localizacao: "",
    cl: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!f.numero.trim()) throw new Error("Nº é obrigatório");
      const { error } = await supabase.from("equipamentos").insert({
        numero: f.numero.trim(),
        identificacao: f.identificacao || null,
        placa: f.placa || null,
        ano: f.ano || null,
        localizacao: f.localizacao || null,
        cl: f.cl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento criado");
      setF({ numero: "", identificacao: "", placa: "", ano: "", localizacao: "", cl: "" });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" /> Novo equipamento
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nº *</Label>
          <Input
            value={f.numero}
            onChange={(e) => setF({ ...f, numero: e.target.value })}
            placeholder="RE-14"
          />
        </div>
        <div>
          <Label className="text-xs">Classe</Label>
          <Input value={f.cl} onChange={(e) => setF({ ...f, cl: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Identificação</Label>
        <Input
          value={f.identificacao}
          onChange={(e) => setF({ ...f, identificacao: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Placa</Label>
          <Input value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Ano</Label>
          <Input value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Localização</Label>
        <Input
          value={f.localizacao}
          onChange={(e) => setF({ ...f, localizacao: e.target.value })}
        />
      </div>
      <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
        {create.isPending ? "Criando..." : "Criar equipamento"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Os demais campos podem ser preenchidos depois na tela do equipamento.
      </p>
    </Card>
  );
}

function Usuarios() {
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const del = useServerFn(adminDeleteUser);
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  const [f, setF] = useState({ matricula: "", password: "", fullName: "", phone: "" });

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          matricula: f.matricula,
          password: f.password,
          fullName: f.fullName,
          phone: f.phone || null,
          role: "colaborador",
        },
      }),
    onSuccess: () => {
      toast.success("Colaborador criado");
      setF({ matricula: "", password: "", fullName: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Cadastrar colaborador
        </h3>
        <div>
          <Label className="text-xs">Nome completo *</Label>
          <Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Matrícula *</Label>
            <Input
              value={f.matricula}
              onChange={(e) => setF({ ...f, matricula: e.target.value })}
              placeholder="Ex: 12345"
              className="uppercase"
            />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Senha inicial *</Label>
          <Input
            type="text"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            placeholder="mín. 8 caracteres"
          />
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending} className="w-full">
          {m.isPending ? "Criando..." : "Criar colaborador"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          O colaborador fará login com a <b>matrícula</b> e a senha definida aqui.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Usuários cadastrados</h3>
        {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        <ul className="divide-y divide-border">
          {users?.map((u) => (
            <li key={u.id} className="py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {u.isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-accent" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.full_name || emailToMat(u.email)}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  MAT {emailToMat(u.email)}
                </p>
              </div>
              <Badge variant={u.isAdmin ? "default" : "secondary"} className="text-[10px]">
                {u.isAdmin ? "Admin" : "Colab"}
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Remover {u.full_name || emailToMat(u.email)}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      O usuário perderá acesso ao aplicativo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => d.mutate(u.id)}>Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
