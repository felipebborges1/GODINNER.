"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { safeNext } from "@/lib/safe-next";

const cuisines = [
  ["🍣", "Japonesa"], ["🍝", "Italiana"], ["🥩", "Carnes"], ["🍔", "Hambúrguer"], ["🍕", "Pizza"],
  ["🍷", "Wine bar"], ["🍺", "Bares"], ["🥗", "Saudável"], ["☕", "Café"], ["🍰", "Doces"],
] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentUserId, users, toggleFollow, showToast } = useAppContext();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const next = safeNext(params.get("next"));
  const suggestions = useMemo(() => users.filter((user) => user.id !== currentUserId).slice(0, 4), [currentUserId, users]);

  const finish = () => {
    if (typeof window !== "undefined" && currentUserId) {
      window.localStorage.setItem(`godinner:onboarding:${currentUserId}`, JSON.stringify({ cuisines: selectedCuisines, completedAt: new Date().toISOString() }));
    }
    showToast("Tudo pronto. Vamos explorar!");
    router.replace(next);
    router.refresh();
  };

  const toggleCuisine = (cuisine: string) => setSelectedCuisines((current) => current.includes(cuisine) ? current.filter((item) => item !== cuisine) : [...current, cuisine]);
  const toggleSuggestedFollow = async (userId: string) => {
    const added = await toggleFollow(userId);
    setFollowed((current) => added ? [...current, userId] : current.filter((id) => id !== userId));
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-28 sm:py-14">
      <div className="mb-8 flex items-center justify-between">
        <p className="text-sm font-black tracking-wide text-orange-600">PRIMEIRO ACESSO</p>
        <Link href={next} className="text-sm font-bold text-stone-500">Pular</Link>
      </div>
      {step === 1 ? (
        <section>
          <h1 className="text-3xl font-black tracking-tight">O que você gosta de comer?</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Escolha alguns sabores para deixar suas descobertas mais com a sua cara.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cuisines.map(([icon, label]) => {
              const active = selectedCuisines.includes(label);
              return <button type="button" key={label} onClick={() => toggleCuisine(label)} aria-pressed={active} className={`min-h-16 rounded-2xl border px-3 text-left text-sm font-bold transition ${active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700"}`}><span className="mr-2 text-xl" aria-hidden="true">{icon}</span>{label}</button>;
            })}
          </div>
          <button type="button" onClick={() => setStep(2)} className="mt-8 min-h-12 w-full rounded-2xl bg-stone-950 px-4 text-sm font-black text-white">Continuar</button>
        </section>
      ) : (
        <section>
          <h1 className="text-3xl font-black tracking-tight">Quem você quer acompanhar?</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Siga algumas pessoas para começar seu feed com recomendações reais.</p>
          <div className="mt-7 grid gap-3">
            {suggestions.map((user) => {
              const isFollowing = followed.includes(user.id);
              return <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3"><UserAvatar src={user.avatar} name={user.name} size="sm"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{user.name}</p><p className="truncate text-xs text-stone-500">@{user.username} · {user.neighborhood}</p></div><button type="button" onClick={() => void toggleSuggestedFollow(user.id)} className={`min-h-10 rounded-full px-3 text-xs font-black ${isFollowing ? "bg-stone-100 text-stone-700" : "bg-orange-500 text-white"}`}>{isFollowing ? "Seguindo" : "Seguir"}</button></div>;
            })}
          </div>
          <button type="button" onClick={finish} className="mt-8 min-h-12 w-full rounded-2xl bg-stone-950 px-4 text-sm font-black text-white">Começar a explorar</button>
          <button type="button" onClick={finish} className="mt-3 min-h-11 w-full rounded-2xl bg-stone-100 px-4 text-sm font-bold text-stone-700">Pular por agora</button>
        </section>
      )}
    </main>
  );
}
