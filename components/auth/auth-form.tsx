"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("next"));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    if (mode === "register" && password !== confirmation) { setError("As senhas precisam ser iguais."); return; }
    if (password.length < 8) { setError("Use uma senha com pelo menos 8 caracteres."); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("A autenticação Supabase ainda não foi configurada neste ambiente."); return; }
    setBusy(true);
    const response = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim(), username: username.trim().toLowerCase() } } });
    setBusy(false);
    if (response.error) { setError("Não foi possível concluir. Verifique os dados e tente novamente."); return; }
    if (mode === "register" && !response.data.session) { setMessage("Cadastro criado. Confirme seu e-mail para entrar."); return; }
    router.replace(next);
    router.refresh();
  }

  return <main className="mx-auto max-w-md px-4 py-10 pb-28"><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">{mode === "login" ? "Entrar" : "Criar sua conta"}</h1><p className="mt-2 text-sm text-stone-500">{mode === "login" ? "Continue suas descobertas gastronômicas." : "Crie seu perfil e organize suas experiências."}</p><form onSubmit={submit} className="mt-6 space-y-4">{mode === "register" && <><label className="block text-sm font-bold">Nome<input className="input mt-1" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="block text-sm font-bold">Username<input className="input mt-1" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} pattern="[a-z0-9_.]{2,32}" required /></label></>}<label className="block text-sm font-bold">E-mail<input className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="block text-sm font-bold">Senha<input className="input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>{mode === "register" && <label className="block text-sm font-bold">Confirmar senha<input className="input mt-1" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></label>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}<button disabled={busy} className="min-h-12 w-full rounded-2xl bg-stone-950 px-4 font-black text-white disabled:opacity-60">{busy ? "Enviando…" : mode === "login" ? "Entrar" : "Criar conta"}</button></form><p className="mt-6 text-center text-sm text-stone-500">{mode === "login" ? <>Ainda não tem conta? <Link className="font-black text-orange-600" href={`/register${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}>Criar conta</Link></> : <>Já tem conta? <Link className="font-black text-orange-600" href={`/login${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}>Entrar</Link></>}</p></div></main>;
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
