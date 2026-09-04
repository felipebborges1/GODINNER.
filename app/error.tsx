"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route rendering error", error);
  }, [error]);

  return <main className="mx-auto flex min-h-[70svh] max-w-xl items-center px-4 py-12 text-center sm:px-6">
    <section className="w-full rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-black uppercase tracking-wide text-orange-600">Vamos tentar de novo</p>
      <h1 className="mt-3 text-2xl font-black tracking-tight text-stone-950">Não conseguimos abrir esta tela.</h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">Se o problema continuar, volte para o Discover e tente novamente mais tarde.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-orange-500 px-4 text-sm font-black text-white">Tentar novamente</button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-stone-100 px-4 text-sm font-black text-stone-800">Ir para Discover</Link>
      </div>
    </section>
  </main>;
}
