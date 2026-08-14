"use client";

import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAppContext } from "@/hooks/use-app-context";
import { ProfileView } from "./profile-view";

export function UserRouteClient({ username }: { username: string }) {
  const { currentUserId, users, isLoading, dataError, retryData } = useAppContext();
  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-10"><LoadingSkeleton className="h-24 w-24 rounded-full"/><LoadingSkeleton className="mt-5 h-8 w-56"/><LoadingSkeleton className="mt-8 h-48"/></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;
  const user = users.find((item) => item.username === username);
  if (!user) notFound();
  return <ProfileView userId={user.id} own={user.id === currentUserId}/>;
}
