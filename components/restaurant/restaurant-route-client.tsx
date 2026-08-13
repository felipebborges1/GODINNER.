"use client";
import { notFound } from "next/navigation";
import { RestaurantProfile } from "./restaurant-profile";
import { useAppContext } from "@/hooks/use-app-context";
export function RestaurantRouteClient({slug}:{slug:string}){const {restaurants}=useAppContext();const restaurant=restaurants.find(r=>r.slug===slug);if(!restaurant)notFound();if(restaurant.status==="rejected")return <main className="mx-auto max-w-xl px-4 py-16 text-center"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">Este cadastro não foi aprovado.</h1><p className="mt-3 text-stone-500">Ele não está disponível para descoberta pública.</p></main>;return <RestaurantProfile restaurant={restaurant}/>;}
