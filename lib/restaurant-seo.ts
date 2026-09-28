import type { Metadata } from "next";
import type { RestaurantRow } from "@/lib/supabase/database.types";
import { SITE_URL } from "@/lib/seo";

export type PublicRestaurantSeo = Pick<RestaurantRow, "id" | "slug" | "name" | "category" | "address" | "city" | "neighborhood" | "cuisines" | "country_code" | "price_range" | "status" | "merged_into_id">;
export const PUBLIC_RESTAURANT_SEO_FIELDS = "id,slug,name,category,address,city,neighborhood,cuisines,country_code,price_range,status,merged_into_id";

export function isPublicRestaurantSeo(row: Pick<PublicRestaurantSeo, "slug" | "name" | "status" | "merged_into_id">) {
  return row.status === "published" && !row.merged_into_id && Boolean(row.name.trim()) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(row.slug);
}

export function restaurantCanonical(slug: string) {
  return `${SITE_URL}/restaurant/${encodeURIComponent(slug)}`;
}

export function restaurantMetadata(restaurant: PublicRestaurantSeo, preview: boolean): Metadata {
  const locality = [restaurant.neighborhood, restaurant.city].filter(Boolean).join(", ");
  const title = `${restaurant.name}${restaurant.city ? ` em ${restaurant.city}` : ""} | GODINNER`;
  const description = `Conheça ${restaurant.name}${locality ? ` em ${locality}` : ""}. Consulte o endereço e as experiências da comunidade GODINNER e compartilhe sua avaliação.`;
  const url = restaurantCanonical(restaurant.slug);
  return {
    title, description,
    alternates: { canonical: url },
    robots: { index: !preview, follow: !preview },
    openGraph: { title, description, url, type: "website", siteName: "GODINNER", locale: "pt_BR", images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "GODINNER" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

export function restaurantStructuredData(restaurant: PublicRestaurantSeo) {
  // Only public facts rendered on the page. No Google rating, inferred review
  // aggregate, personal authorship, opening hours or fixed coordinates.
  return {
    "@context": "https://schema.org",
    "@type": restaurant.category === "bar" ? "BarOrPub" : "Restaurant",
    "@id": `${restaurantCanonical(restaurant.slug)}#restaurant`,
    name: restaurant.name,
    url: restaurantCanonical(restaurant.slug),
    ...(restaurant.address ? { address: {
      "@type": "PostalAddress", streetAddress: restaurant.address,
      ...(restaurant.city ? { addressLocality: restaurant.city } : {}),
      ...(restaurant.country_code ? { addressCountry: restaurant.country_code } : {}),
    } } : {}),
    ...(restaurant.price_range ? { priceRange: restaurant.price_range } : {}),
  };
}
