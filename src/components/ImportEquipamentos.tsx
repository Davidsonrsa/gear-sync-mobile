import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Mapeamento dos cabeçalhos da planilha → colunas da tabela
const COLS = [
  "item", "cl", "numero", "cartao_ticket", "identificacao", "afericao_taco",
  "placa", "ano", "localizacao", "operador_contato", "telefone", "cnh",
  "data_ultima_revisao", "u_revisao", "h_revisao", "data_horimetro_atual",
  "horimetro_atual", "proxima_revisao_horimetro", "hr_rodado", "observacoes",
] as const;

const NUM = new Set(["u_revisao", "h_revisao", "horimetro_atual", "proxima_revisao_horimetro", "hr_rodado"]);
const DATE = new Set(["data_ultima_revisao", "data_horimetro_atual"]);

function toDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // serial date Excel
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function toText(v: unknown): string | null {
  if (v == null) return null;
  let s = typeof v === "number" && Number.isInteger(v) ? String(v) : String(v);
  s = s.trim();
  return s || null;
}

export function ImportEquipamentos() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // Detecta primeira linha de dados: procura linha cuja célula coluna 2 contenha algo como RE-/numero
      // Padrão da planilha: cabeçalho ocupa até linha 4 (index 3), dados a partir do index 4
      // Heurística: pular linhas até achar uma com numero não nulo na coluna 2 e item numérico na coluna 0
      let start = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r && r[2] && typeof r[0] === "number") { start = i; break; }
      }

      const records: Record<string, unknown>[] = [];
      for (let i = start; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[2]) continue;
        const rec: Record<string, unknown> = {};
        COLS.forEach((c, idx) => {
          const v = r[idx];
          if (c === "item") rec[c] = v == null ? null : Number(v);
          else if (NUM.has(c)) rec[c] = toNum(v);
          else if (DATE.has(c)) rec[c] = toDate(v);
          else rec[c] = toText(v);
        });
        if (!rec.numero) continue;
        records.push(rec);
      }

      if (records.length === 0) {
        toast.error("Nenhuma linha válida encontrada");
        return;
      }

      // Insere em lotes
      const batch = 100;
      let ok = 0;
      for (let i = 0; i < records.length; i += batch) {
        const slice = records.slice(i, i + batch);
        const { error } = await supabase.from("equipamentos").insert(slice as never);
        if (error) throw error;
        ok += slice.length;
      }
      toast.success(`${ok} equipamento(s) importado(s)`);
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    } catch (e) {
      toast.error((e as Error).message || "Falha ao importar");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4" /> Importar planilha
      </h3>
      <p className="text-[11px] text-muted-foreground">
        Aceita Excel (.xlsx) ou CSV. Use o mesmo layout da planilha (ITEM, CL, Nº, CARTAO TICKET, IDENTIFICAÇÃO, AFERIÇÃO, PLACA, ANO, LOCALIZAÇÃO, OPERADOR, TELEFONE, CNH, DATA, U.REVISÃO, H.REVISÃO, DATA, H.ATUAL, PROX. REVISÃO, HR RODADO, OBSERVAÇÕES).
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy} className="w-full">
        <Upload className="w-4 h-4" /> {busy ? "Importando..." : "Selecionar arquivo"}
      </Button>
    </Card>
  );
}
