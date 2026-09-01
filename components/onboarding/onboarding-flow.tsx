"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

const cuisines = [
  ["🍣", "Japonesa"], ["🍝", "Italiana"], ["🥩", "Carnes"], ["🍔", "Hambúrguer"], ["🍕", "Pizza"],
  ["🍷", "Wine bar"], ["🍺", "Bares"], ["🥗", "Saudável"], ["☕", "Café"], ["🍰", "Doces"],
] as const;
const usernamePattern = /^[a-z0-9_.]{2,32}$/;

export function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentUserId, users, toggleFollow, showToast } = useAppContext();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [usernameRequired, setUsernameRequired] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const next = safeNext(params.get("next"));
  const suggestions = useMemo(() => users.filter((user) => user.id !== currentUserId).slice(0, 4), [currentUserId, users]);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    const client = createSupabaseBrowserClient();
    async function loadProfileState() {
      if (!client) {
        await Promise.resolve();
        if (active) setUsernameError("Não foi possível preparar seu perfil agora.");
        return;
      }
      const response = await client.from("profiles").select("username_needs_confirmation").eq("id", currentUserId).maybeSingle();
      if (!active) return;
      if (response.error || !response.data) {
        setUsernameError("Não foi possível preparar seu perfil agora.");
        return;
      }
      setUsernameRequired(response.data.username_needs_confirmation);
    }
    void loadProfileState();
    return () => { active = false; };
  }, [currentUserId]);

  const finish = () => {
    if (typeof window !== "undefined" && currentUserId) {
      window.localStorage.setItem(`godinner:onboarding:${currentUserId}`, JSON.stringify({ cuisines: selectedCuisines, completedAt: new Date().toISOString() }));
    }
    showToast("Tudo pronto. Vamos explorar!");
    router.replace(next);
    router.refresh();
  };

  const claimUsername = async (event: React.FormEvent) => {
    event.preventDefault();
    const requestedUsername = username.trim().toLowerCase();
    setUsernameError("");
    if (!usernamePattern.test(requestedUsername)) {
      setUsernameError("Use de 2 a 32 caracteres: letras minúsculas, números, ponto ou _.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUsernameError("Não foi possível preparar seu perfil agora.");
      return;
    }
    setUsernameBusy(true);
    const response = await supabase.rpc("claim_profile_username", { requested_username: requestedUsername });
    if (response.error) {
      setUsernameBusy(false);
      setUsernameError(response.error.code === "23505" ? "Este username já está em uso." : "Não foi possível salvar seu username. Tente novamente.");
      return;
    }
    window.location.replace(`/onboarding?next=${encodeURIComponent(next)}`);
  };

  const toggleCuisine = (cuisine: string) => setSelectedCuisines((current) => current.includes(cuisine) ? current.filter((item) => item !== cuisine) : [...current, cuisine]);
  const toggleSuggestedFollow = async (userId: string) => {
    const added = await toggleFollow(userId);
    setFollowed((current) => added ? [...current, userId] : current.filter((id) => id !== userId));
  };

  if (usernameError && usernameRequired === null) return <main className="mx-auto max-w-xl px-4 py-12 pb-28"><p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{usernameError}</p></main>;
  if (usernameRequired === null) return <main className="mx-auto max-w-xl px-4 py-12 pb-28 text-sm font-bold text-stone-500">Preparando seu perfil...</main>;
  if (usernameRequired) return <main className="mx-auto max-w-xl px-4 py-8 pb-28 sm:py-14"><section className="mx-auto max-w-md"><p className="text-sm font-black tracking-wide text-orange-600">PRIMEIRO ACESSO</p><h1 className="mt-3 text-3xl font-black tracking-tight">Escolha seu username</h1><p className="mt-2 text-sm leading-6 text-stone-600">Ele será usado no seu perfil, nas menções e para as pessoas encontrarem você no GODINNER.</p><form onSubmit={claimUsername} className="mt-7 space-y-4"><label className="block text-sm font-bold" htmlFor="onboarding-username">Username<div className="mt-1 flex items-center rounded-2xl bg-stone-100 px-4 ring-orange-500 focus-within:ring-2"><span className="text-sm text-stone-500">@</span><input id="onboarding-username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="username" maxLength={32} required className="min-h-12 min-w-0 flex-1 bg-transparent pl-1 text-sm outline-none"/></div></label><p className="text-xs leading-5 text-stone-500">De 2 a 32 caracteres: letras minúsculas, números, ponto ou _.</p>{usernameError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{usernameError}</p>}<Button type="submit" disabled={usernameBusy} className="min-h-12 w-full rounded-2xl">{usernameBusy ? "Salvando…" : "Continuar"}</Button></form></section></main>;

  return <main className="mx-auto max-w-xl px-4 py-8 pb-28 sm:py-14"><div className="mb-8 flex items-center justify-between"><p className="text-sm font-black tracking-wide text-orange-600">PRIMEIRO ACESSO</p><Link href={next} className="text-sm font-bold text-stone-500">Pular</Link></div>{step === 1 ? <section><h1 className="text-3xl font-black tracking-tight">O que você gosta de comer?</h1><p className="mt-2 text-sm leading-6 text-stone-600">Escolha alguns sabores para deixar suas descobertas mais com a sua cara.</p><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{cuisines.map(([icon, label]) => { const active = selectedCuisines.includes(label); return <button type="button" key={label} onClick={() => toggleCuisine(label)} aria-pressed={active} className={`min-h-16 rounded-2xl border px-3 text-left text-sm font-bold transition ${active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700"}`}><span className="mr-2 text-xl" aria-hidden="true">{icon}</span>{label}</button>; })}</div><Button type="button" onClick={() => setStep(2)} className="mt-8 min-h-12 w-full rounded-2xl">Continuar</Button></section> : <section><h1 className="text-3xl font-black tracking-tight">Quem você quer acompanhar?</h1><p className="mt-2 text-sm leading-6 text-stone-600">Siga algumas pessoas para começar seu feed com recomendações reais.</p><div className="mt-7 grid gap-3">{suggestions.map((user) => { const isFollowing = followed.includes(user.id); return <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3"><UserAvatar src={user.avatar} name={user.name} size="sm"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{user.name}</p><p className="truncate text-xs text-stone-500">@{user.username} · {user.neighborhood}</p></div><Button type="button" onClick={() => void toggleSuggestedFollow(user.id)} variant={isFollowing ? "soft" : "accent"} className="min-h-10 rounded-full px-3 text-xs">{isFollowing ? "Seguindo" : "Seguir"}</Button></div>; })}</div><Button type="button" onClick={finish} className="mt-8 min-h-12 w-full rounded-2xl">Começar a explorar</Button><Button type="button" onClick={finish} variant="soft" className="mt-3 min-h-11 w-full rounded-2xl">Pular por agora</Button></section>}</main>;
}
