"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/safe-next";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(() => params.get("error") === "auth_callback" ? "Não foi possível confirmar o e-mail. Solicite um novo link e tente novamente." : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("next"));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "register") trackEvent("signup_started");
    setError(""); setMessage("");
    if (mode === "register" && password !== confirmation) { setError("As senhas precisam ser iguais."); return; }
    if (password.length < 8) { setError("Use uma senha com pelo menos 8 caracteres."); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("A autenticação Supabase ainda não foi configurada neste ambiente."); return; }
    setBusy(true);
    const response = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { name: name.trim(), username: username.trim().toLowerCase() },
          },
        });
    setBusy(false);
    if (response.error) { setError("Não foi possível concluir. Verifique os dados e tente novamente."); return; }
    if (mode === "login") trackEvent("login_completed");
    if (mode === "register" && !response.data.session) { setMessage("Cadastro criado. Confirme seu e-mail para entrar."); return; }
    if (mode === "register") {
      trackEvent("signup_completed");
      router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
      router.refresh();
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return <main className="mx-auto max-w-md px-4 py-10 pb-28"><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">{mode === "login" ? "Entrar" : "Criar sua conta"}</h1><p className="mt-2 text-sm text-stone-500">{mode === "login" ? "Continue suas descobertas gastronômicas." : "Crie seu perfil e organize suas experiências."}</p><form onSubmit={submit} className="mt-6 space-y-4">{mode === "register" && <><label className="block text-sm font-bold">Nome<input className="input mt-1" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="block text-sm font-bold">Username<input className="input mt-1" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} pattern="[a-z0-9_.]{2,32}" required /></label></>}<label className="block text-sm font-bold">E-mail<input className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><div><div className="flex items-center justify-between gap-3"><label htmlFor="auth-password" className="text-sm font-bold">Senha</label>{mode === "login" && <Link className="text-xs font-black text-orange-600 hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500" href={`/forgot-password${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}>Esqueci a senha</Link>}</div><input id="auth-password" className="input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></div>{mode === "register" && <label className="block text-sm font-bold">Confirmar senha<input className="input mt-1" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></label>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}<Button type="submit" disabled={busy} className="min-h-12 w-full rounded-2xl">{busy ? "Enviando…" : mode === "login" ? "Entrar" : "Criar conta"}</Button></form><p className="mt-6 text-center text-sm text-stone-500">{mode === "login" ? <>Ainda não tem conta? <Link className="font-black text-orange-600" href={`/register${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}>Criar conta</Link></> : <>Já tem conta? <Link className="font-black text-orange-600" href={`/login${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}>Entrar</Link></>}</p></div></main>;
}
