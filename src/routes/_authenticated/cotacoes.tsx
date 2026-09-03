import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  beforeLoad: requireAdmin,
  component: CotacoesLayout,
});

function CotacoesLayout() {
  return <Outlet />;
}
