import type { Metadata } from "next";
import Link from "next/link";
import DiscoverPage from "@/components/discover/discover-page";
import { SITE_URL, SITE_ALTERNATE_NAME, jsonLd } from "@/lib/seo";

const title = `GODINNER (${SITE_ALTERNATE_NAME}) — Descubra restaurantes`;
const description = `GODINNER, ou ${SITE_ALTERNATE_NAME}: descubra restaurantes, acompanhe avaliações de amigos e compartilhe suas experiências gastronômicas.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SITE_URL },
  openGraph: { url: SITE_URL, title, description, siteName: "GODINNER", locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: "GODINNER", alternateName: SITE_ALTERNATE_NAME, url: SITE_URL, description, inLanguage: "pt-BR" }) }}/>
    <DiscoverPage/>
    <section className="mx-auto max-w-6xl border-t border-stone-200 px-4 py-8 text-stone-600 sm:px-6" aria-labelledby="about-godinner">
      <h2 id="about-godinner" className="text-lg font-bold text-stone-900">GODINNER: descubra restaurantes com quem você confia</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6">GODINNER, ou {SITE_ALTERNATE_NAME}, é sua comunidade para descobrir restaurantes e bares. Acompanhe experiências de amigos e compartilhe suas avaliações de comida, ambiente e serviço.</p>
      <nav aria-label="Sobre o GODINNER" className="mt-4 flex flex-wrap gap-5 text-sm font-semibold"><Link href="/sobre">Conheça o GODINNER</Link><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos de uso</Link></nav>
    </section>
  </>;
}
