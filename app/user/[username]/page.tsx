import { Suspense } from "react";
import { UserRouteClient } from "@/components/profile/user-route-client";

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando perfil...</div>}><UserRouteClient username={username}/></Suspense>;
}
