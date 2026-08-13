import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CURRENT_USER_ID, users } from "@/data/mocks";
import { ProfileView } from "@/components/profile/profile-view";

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = users.find((item) => item.username === username);
  if (!user) notFound();
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando perfil…</div>}><ProfileView userId={user.id} own={user.id === CURRENT_USER_ID}/></Suspense>;
}
