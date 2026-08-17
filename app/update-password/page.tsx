import { Suspense } from "react";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return <Suspense fallback={<div className="p-8 text-sm text-stone-500">Carregando…</div>}><UpdatePasswordForm /></Suspense>;
}
