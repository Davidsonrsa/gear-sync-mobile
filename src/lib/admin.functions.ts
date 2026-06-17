import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DOMAIN = "sphjhm.app";
function matToEmail(mat: string) {
  const m = mat.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `mat-${m}@${DOMAIN}`;
}

const createUserSchema = z.object({
  matricula: z.string().min(1).max(40),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  role: z.enum(["admin", "colaborador"]),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never);
    if (!isAdmin) throw new Error("Acesso negado: somente admin.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = matToEmail(data.matricula);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone ?? "", matricula: data.matricula.trim().toUpperCase() },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: "admin" });
    }
    if (data.phone) {
      await supabaseAdmin.from("profiles").update({ phone: data.phone }).eq("id", newId);
    }
    return { id: newId };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never);
    if (!isAdmin) throw new Error("Acesso negado.");

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");

    return (profiles ?? []).map((p) => ({
      ...p,
      isAdmin: roles?.some((r) => r.user_id === p.id && r.role === "admin") ?? false,
    }));
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never);
    if (!isAdmin) throw new Error("Acesso negado.");
    if (data.userId === context.userId) throw new Error("Você não pode excluir a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
