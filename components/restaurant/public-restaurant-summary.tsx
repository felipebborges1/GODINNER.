import type { PublicRestaurantSeo } from "@/lib/restaurant-seo";

// Real, visible content while the interactive profile initializes; never a
// crawler-only copy or hidden block, and never a synthetic rating of zero.
export function PublicRestaurantSummary({ restaurant }: { restaurant: PublicRestaurantSeo }) {
  return <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <p className="text-sm font-semibold text-stone-500">{restaurant.category === "bar" ? "Bar" : "Restaurante"}</p>
    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{restaurant.name}</h1>
    <p className="mt-3 text-stone-600">{[restaurant.neighborhood, restaurant.city].filter(Boolean).join(" · ")}</p>
    {restaurant.address && <section className="mt-6"><h2 className="text-lg font-bold">Endereço</h2><p className="mt-2 text-stone-600">{restaurant.address}</p></section>}
    {restaurant.price_range && <p className="mt-4 text-sm text-stone-600">Faixa editorial: {restaurant.price_range}</p>}
    <p role="status" className="mt-6 text-sm text-stone-500">Carregando experiências e opções de avaliação…</p>
  </article>;
}
