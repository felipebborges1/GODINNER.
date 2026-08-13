import { RestaurantRouteClient } from "@/components/restaurant/restaurant-route-client";
export default async function RestaurantPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <RestaurantRouteClient slug={slug}/>;}
