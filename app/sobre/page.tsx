import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "O que é o GODINNER? Descubra e avalie restaurantes",
  description: "Conheça o GODINNER: uma comunidade para descobrir restaurantes e bares, acompanhar amigos e compartilhar experiências gastronômicas.",
  alternates: { canonical: `${SITE_URL}/sobre` },
};

export default function AboutPage() {
  return <article className="mx-auto max-w-3xl px-5 py-12 text-stone-700">
    <p className="font-black text-orange-600">GODINNER</p>
    <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">Seu próximo restaurante começa com uma boa indicação.</h1>
    <p className="mt-6 text-lg leading-8">O GODINNER é uma comunidade para descobrir restaurantes, bares e experiências gastronômicas pelas avaliações de amigos e de outras pessoas. A proposta é ajudar você a decidir onde ir e compartilhar os lugares que conheceu.</p>
    <h2 className="mt-10 text-2xl font-bold text-stone-950">Descubra lugares</h2>
    <p className="mt-3 leading-7">Explore restaurantes e bares, consulte as avaliações disponíveis e encontre opções para a próxima saída. O catálogo está em expansão e a cobertura varia conforme a região.</p>
    <h2 className="mt-10 text-2xl font-bold text-stone-950">Compartilhe sua experiência</h2>
    <p className="mt-3 leading-7">Avalie comida, ambiente e serviço, conte como foi sua visita e inclua fotos se desejar. Cada experiência ajuda outras pessoas a conhecer melhor um lugar.</p>
    <h2 className="mt-10 text-2xl font-bold text-stone-950">Acompanhe quem você conhece</h2>
    <p className="mt-3 leading-7">Siga amigos e organize os lugares que quer conhecer em listas. As notas GODINNER representam avaliações da comunidade; consulte também a quantidade de avaliações para entender o contexto.</p>
    <p className="mt-8 leading-7">O GODINNER está em Beta. Estamos aprimorando a experiência com o uso e o feedback da comunidade.</p>
    <Link href="/" className="mt-8 inline-flex rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white">Explorar o GODINNER</Link>
    <nav className="mt-10 flex gap-5 text-sm underline" aria-label="Informações legais"><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos de uso</Link></nav>
  </article>;
}
