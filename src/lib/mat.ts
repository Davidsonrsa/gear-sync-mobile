// Helpers para login por Matrícula (sem e-mail real)
const DOMAIN = "sphjhm.app";

export function normalizeMat(mat: string): string {
  return mat
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function matToEmail(mat: string): string {
  const m = normalizeMat(mat);
  return `mat-${m}@${DOMAIN}`;
}

export function emailToMat(email: string | null | undefined): string {
  if (!email) return "";
  const m = email.match(/^mat-([a-z0-9]+)@/i);
  return m ? m[1].toUpperCase() : email;
}
