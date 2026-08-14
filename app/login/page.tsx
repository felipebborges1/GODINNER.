import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() { return <Suspense fallback={<div className="p-8 text-sm text-stone-500">Carregando…</div>}><AuthForm mode="login" /></Suspense>; }
