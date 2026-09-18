import type { Metadata } from "next";
import Link from "next/link";
import DiscoverPage from "@/components/discover/discover-page";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, jsonLd } from "@/lib/seo";

export const metadata: Metadata = { alternates: { canonical: SITE_URL }, openGraph: { url: SITE_URL, title: SITE_TITLE, description: SITE_DESCRIPTION, siteName: "GODINNER", locale: "pt_BR", type: "website" } };

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: "GODINNER", url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: "pt-BR" }) }}/>
    <DiscoverPage/>
    <section className="mx-auto max-w-6xl border-t border-stone-200 px-4 py-8 text-stone-600 sm:px-6" aria-labelledby="about-godinner">
      <h2 id="about-godinner" className="text-lg font-bold text-stone-900">GODINNER: descubra restaurantes com quem você confia</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6">Encontre restaurantes e bares, acompanhe experiências de amigos e compartilhe suas avaliações de comida, ambiente e serviço.</p>
      <nav aria-label="Sobre o GODINNER" className="mt-4 flex flex-wrap gap-5 text-sm font-semibold"><Link href="/sobre">Conheça o GODINNER</Link><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos de uso</Link></nav>
    </section>
  </>;
}
