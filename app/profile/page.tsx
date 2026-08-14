"use client";

import { Suspense } from "react";
import { ProfileView } from "@/components/profile/profile-view";
import { useAppContext } from "@/hooks/use-app-context";
import { ErrorState } from "@/components/ui/error-state";

export default function ProfilePage() {
  const { currentUserId, isLoading, dataError, retryData } = useAppContext();

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando perfil...</div>}>
      {isLoading ? <div className="mx-auto max-w-2xl px-4 py-10 text-sm font-bold text-stone-500">Carregando seu perfil...</div> : dataError ? <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div> : currentUserId ? <ProfileView userId={currentUserId} own /> : <div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Entre para ver seu perfil.</div>}
    </Suspense>
  );
}
