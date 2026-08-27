"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useAppContext } from "@/hooks/use-app-context";

export function NotificationBell({ mobile = false }: { mobile?: boolean }) {
  const { currentUserId, unreadNotificationCount, isAuthLoading } = useAppContext();
  if (!currentUserId || isAuthLoading) return null;
  const countLabel = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  const label = unreadNotificationCount ? `Notificações, ${countLabel} não lidas` : "Notificações";
  return <Link href="/notifications" onClick={() => trackEvent("notification_center_opened")} aria-label={label} className={`relative grid min-h-11 min-w-11 place-items-center rounded-full text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-stone-200 dark:hover:bg-stone-800 ${mobile ? "border border-stone-200 bg-white/95 shadow-sm dark:border-stone-700 dark:bg-stone-950/95" : ""}`}>
    <Bell size={20}/>
    {unreadNotificationCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-black leading-4 text-white">{countLabel}</span>}
  </Link>;
}
