"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";

export function InviteLanding({ code, firstName, avatar }: { code: string; firstName: string; avatar: string | null }) {
  const [tracking, setTracking] = useState<"pending" | "ready" | "failed">("pending");
  useEffect(() => {
    let active = true;
    fetch("/api/invites/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), cache: "no-store" })
      .then(response => { if (active) setTracking(response.ok ? "ready" : "failed"); })
      .catch(() => { if (active) setTracking("failed"); });
    return () => { active = false; };
  }, [code]);

  return <div className="mx-auto grid min-h-[70vh] max-w-4xl place-items-center px-4 py-12 sm:px-6"><section className="w-full rounded-[2rem] bg-white p-7 text-center shadow-sm ring-1 ring-stone-200 sm:p-12">
    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Um convite especial</p>
    <div className="mx-auto mt-7 w-fit"><UserAvatar src={avatar} name={firstName} size="lg"/></div>
    <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">{firstName} convidou você para o GODINNER</h1>
    <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-stone-600">Descubra lugares e compartilhe suas experiências com seus amigos.</p>
    <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">{tracking === "pending" ? <><span aria-disabled="true" className="grid min-h-12 place-items-center rounded-full bg-orange-200 px-6 font-black text-white">Criar minha conta</span><span aria-disabled="true" className="grid min-h-12 place-items-center rounded-full border border-stone-200 px-6 font-black text-stone-400">Já tenho conta</span></> : <><Link href="/register" className="grid min-h-12 place-items-center rounded-full bg-orange-600 px-6 font-black text-white">Criar minha conta</Link><Link href="/login" className="grid min-h-12 place-items-center rounded-full border border-stone-300 px-6 font-black">Já tenho conta</Link></>}</div>
    {tracking === "pending" && <p role="status" className="mt-5 text-xs text-stone-500">Preparando seu convite…</p>}
    {tracking === "failed" && <p role="status" className="mt-5 text-xs text-stone-500">Você pode continuar, mas a indicação talvez não seja registrada agora.</p>}
  </section></div>;
}
