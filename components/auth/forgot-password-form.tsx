"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("A autenticação Supabase ainda não foi configurada neste ambiente.");
      return;
    }
    setBusy(true);
    const updatePath = `/update-password${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(updatePath)}`,
    });
    setBusy(false);
    if (error) {
      setError("Não foi possível enviar o e-mail agora. Aguarde um pouco e tente novamente.");
      return;
    }
    setMessage("Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
  }

  const loginHref = `/login${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`;

  return <main className="mx-auto max-w-md px-4 py-10 pb-28"><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">Recuperar senha</h1><p className="mt-2 text-sm leading-6 text-stone-500">Informe o e-mail da sua conta. Enviaremos um link seguro para você escolher uma nova senha.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold">E-mail<input className="input mt-1" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}<Button type="submit" disabled={busy || Boolean(message)} className="min-h-12 w-full rounded-2xl">{busy ? "Enviando…" : "Enviar link"}</Button></form><p className="mt-6 text-center text-sm text-stone-500"><Link className="font-black text-orange-600" href={loginHref}>Voltar para entrar</Link></p></div></main>;
}
