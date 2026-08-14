"use client";

import { Suspense } from "react";
import { ProfileView } from "@/components/profile/profile-view";
import { useAppContext } from "@/hooks/use-app-context";

export default function ProfilePage() {
  const { currentUserId } = useAppContext();

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando perfil...</div>}>
      {currentUserId ? <ProfileView userId={currentUserId} own /> : <div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Entre para ver seu perfil.</div>}
    </Suspense>
  );
}
