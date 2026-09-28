import type { MetadataRoute } from "next";
import { SITE_URL, isPreview } from "@/lib/seo";
import { publicSitemapRestaurants } from "@/lib/data/public-restaurant-seo";
import { restaurantCanonical } from "@/lib/restaurant-seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreview) return [];
  const restaurants = await publicSitemapRestaurants();
  if (restaurants.length > 49_996) throw new Error("O catálogo requer divisão do sitemap.");
  return [
    ...["", "/sobre", "/privacy", "/terms"].map(path => ({ url: `${SITE_URL}${path}` })),
    ...restaurants.map(restaurant => ({ url: restaurantCanonical(restaurant.slug) })),
  ];
}
