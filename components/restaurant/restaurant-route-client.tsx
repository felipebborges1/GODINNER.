"use client";
import { notFound } from "next/navigation";
import { RestaurantProfile } from "./restaurant-profile";
import { useAppContext } from "@/hooks/use-app-context";
export function RestaurantRouteClient({slug}:{slug:string}){const {restaurants}=useAppContext();const restaurant=restaurants.find(r=>r.slug===slug);if(!restaurant)notFound();return <RestaurantProfile restaurant={restaurant}/>;}
