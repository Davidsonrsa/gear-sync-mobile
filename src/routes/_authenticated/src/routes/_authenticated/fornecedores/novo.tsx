import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fornecedores/novo")({
  component: NovoFornecedorPage,
});

export default function NovoFornecedorPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!razaoSocial.trim()) return toast.error("Informe a Razão Social.");

    try {
      setSaving(true);
      const { error } = await supabase.from("fornecedores").insert([
        {
          razao_social: razaoSocial.trim(),
          nome_fantasia: nomeFantasia.trim() || null,
          cnpj: cnpj.trim() || null,
          telefone: telefone.trim() || null,
          email: email.trim() || null,
        },
      ]);

      if (error) throw error;

      toast.success("Fornecedor cadastrado com sucesso!");
      navigate({ to: "/fornecedores" });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao cadastrar fornecedor: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate({ to: "/fornecedores" })} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Cadastrar Novo Fornecedor</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Razão Social *</Label>
            <Input
              placeholder="Ex: Comércio de Peças Ltda"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Nome Fantasia</Label>
            <Input
              placeholder="Ex: Peças & Cia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">CNPJ</Label>
            <Input
              placeholder="Ex: 00.000.000/0001-00"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</Label>
            <Input
              placeholder="Ex: 38992458484"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
            <Input
              type="email"
              placeholder="Ex: contato@pecas.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/fornecedores" })}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Fornecedor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
