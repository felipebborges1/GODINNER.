import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RestaurantRouteClient } from "@/components/restaurant/restaurant-route-client";
import { PublicRestaurantSummary } from "@/components/restaurant/public-restaurant-summary";
import { resolveRestaurantPage } from "@/lib/data/public-restaurant-seo";
import { restaurantMetadata, restaurantStructuredData } from "@/lib/restaurant-seo";
import { isPreview, jsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await resolveRestaurantPage((await params).slug);
  if (result.kind === "missing") notFound();
  if (result.kind === "private") return { title: "Cadastro de restaurante | GODINNER", description: "Área de acompanhamento do cadastro.", robots: { index: false, follow: false } };
  return restaurantMetadata(result.restaurant, isPreview);
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  const result = await resolveRestaurantPage(slug);
  if (result.kind === "missing") notFound();
  if (result.kind === "private") return <RestaurantRouteClient slug={slug}/>;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(restaurantStructuredData(result.restaurant)) }}/>
    <RestaurantRouteClient slug={slug}><PublicRestaurantSummary restaurant={result.restaurant}/></RestaurantRouteClient>
  </>;
}
