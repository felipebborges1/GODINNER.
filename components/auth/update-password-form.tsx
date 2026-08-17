"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function UpdatePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next")) === "/" ? "/profile" : safeNext(params.get("next"));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("A autenticação Supabase ainda não foi configurada neste ambiente.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return <main className="mx-auto max-w-md px-4 py-10 pb-28"><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">Criar nova senha</h1><p className="mt-2 text-sm leading-6 text-stone-500">Escolha uma senha segura com pelo menos 8 caracteres.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold">Nova senha<input className="input mt-1" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label><label className="block text-sm font-bold">Confirmar nova senha<input className="input mt-1" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<Button type="submit" disabled={busy} className="min-h-12 w-full rounded-2xl">{busy ? "Salvando…" : "Salvar nova senha"}</Button></form></div></main>;
}
