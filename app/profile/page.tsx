import { Suspense } from "react";
import { CURRENT_USER_ID } from "@/data/mocks";
import { ProfileView } from "@/components/profile/profile-view";

export default function ProfilePage() { return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando perfil…</div>}><ProfileView userId={CURRENT_USER_ID} own/></Suspense>; }
