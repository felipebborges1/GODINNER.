import { notFound } from "next/navigation";
import { restaurants } from "@/data/mocks";
import { RestaurantProfile } from "@/components/restaurant/restaurant-profile";

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = restaurants.find((item) => item.slug === slug);
  if (!restaurant) notFound();
  return <RestaurantProfile restaurant={restaurant}/>;
}
