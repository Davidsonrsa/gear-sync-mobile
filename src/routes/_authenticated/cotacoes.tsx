import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  component: CotacoesLayout,
});

function CotacoesLayout() {
  return <Outlet />;
}
