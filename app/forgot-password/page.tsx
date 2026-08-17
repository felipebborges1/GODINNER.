import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return <Suspense fallback={<div className="p-8 text-sm text-stone-500">Carregando…</div>}><ForgotPasswordForm /></Suspense>;
}
