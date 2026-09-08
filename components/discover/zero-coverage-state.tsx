import Link from "next/link";
import type { ExploreRegion } from "@/context/explore-location-context";

export function ZeroCoverageState({ region }: { region: ExploreRegion }) {
  const place = [region.city, region.region].filter(Boolean).join(", ");
  return <section className="mt-10 rounded-3xl border border-orange-200 bg-orange-50 p-6 text-center sm:p-8" aria-live="polite">
    <p className="text-xs font-black uppercase tracking-wide text-orange-600">Cobertura GODINNER</p>
    <h2 className="mt-2 text-2xl font-black tracking-tight">Estamos chegando a {region.city}</h2>
    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-700">Ainda não temos restaurantes publicados em {place}. Estamos acompanhando o interesse pela cidade.</p>
    <Link href="/search?scope=all" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-black text-white">Explorar lugares no GODINNER</Link>
    <p className="mt-4 text-xs leading-5 text-stone-600">Volte nas próximas 24 horas para conferir novidades.</p>
  </section>;
}
