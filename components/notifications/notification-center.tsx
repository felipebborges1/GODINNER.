"use client";

import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { formatRelativeTime, notificationCopy, notificationDestination } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

export function NotificationCenter() {
  const router = useRouter();
  const { currentUserId, notifications, notificationsHasMore, notificationsLoading, notificationsError, unreadNotificationCount, users, reviews, restaurants, loadNotifications, markNotificationRead, markAllNotificationsRead } = useAppContext();
  if (!currentUserId) return <main className="mx-auto max-w-xl px-4 py-10 pb-28"><section className="rounded-3xl bg-stone-50 p-7 text-center"><Bell className="mx-auto text-orange-500"/><h1 className="mt-4 text-2xl font-black">Suas notificações</h1><p className="mt-2 text-sm leading-6 text-stone-600">Entre para acompanhar suas interações no GODINNER.</p><Button href="/login?next=%2Fnotifications" className="mt-6">Entrar</Button></section></main>;
  const openNotification = async (id: string) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;
    const actor = users.find((user) => user.id === notification.actorUserId);
    const review = reviews.find((item) => item.id === notification.reviewId);
    const restaurant = restaurants.find((item) => item.id === notification.restaurantId);
    const destination = notificationDestination(notification, actor, review, restaurant);
    await markNotificationRead(id);
    trackEvent("notification_opened", { type: notification.type });
    if (destination) router.push(destination);
  };
  const markAll = async () => {
    if (await markAllNotificationsRead()) trackEvent("notifications_mark_all_read");
  };
  return <main className="mx-auto max-w-xl px-4 py-6 pb-28 lg:py-10"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-orange-600">ATUALIZAÇÕES</p><h1 className="text-3xl font-black tracking-tight">Notificações</h1></div>{unreadNotificationCount > 0 && <Button variant="soft" onClick={() => void markAll()} aria-label="Marcar todas as notificações como lidas" className="shrink-0 px-3 text-xs"><CheckCheck size={16}/>Marcar todas</Button>}</div>
    {notificationsLoading && notifications.length === 0 ? <div className="mt-6 space-y-3"><LoadingSkeleton className="h-20"/><LoadingSkeleton className="h-20"/><LoadingSkeleton className="h-20"/></div> : notificationsError && notifications.length === 0 ? <div className="mt-6"><ErrorState message="Não foi possível carregar suas notificações." onRetry={() => void loadNotifications({ reset: true })}/></div> : notifications.length === 0 ? <section className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-14 text-center"><Bell className="mx-auto text-stone-400"/><h2 className="mt-4 text-lg font-black">Você ainda não tem notificações.</h2><p className="mt-2 text-sm leading-6 text-stone-600">Quando alguém interagir com você, a novidade aparece aqui.</p></section> : <div className="mt-6 space-y-2">{notifications.map((notification) => {
      const actor = users.find((user) => user.id === notification.actorUserId);
      const review = reviews.find((item) => item.id === notification.reviewId);
      const restaurant = restaurants.find((item) => item.id === notification.restaurantId);
      const destination = notificationDestination(notification, actor, review, restaurant);
      const unavailable = !destination;
      return <button key={notification.id} type="button" onClick={() => void openNotification(notification.id)} disabled={unavailable} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-default ${notification.readAt ? "bg-white hover:bg-stone-50 dark:bg-stone-900 dark:hover:bg-stone-800" : "bg-orange-50/70 shadow-sm ring-1 ring-orange-100 dark:bg-orange-950/30 dark:ring-orange-900"}`}>
        <UserAvatar src={actor?.avatar} name={actor?.name ?? "Usuário"}/><span className="min-w-0 flex-1"><span className={`block text-sm leading-5 ${notification.readAt ? "font-semibold text-stone-700 dark:text-stone-200" : "font-black text-stone-950 dark:text-white"}`}>{notificationCopy(notification, actor, restaurant)}</span><span className="mt-1 flex items-center gap-2 text-xs text-stone-500"><span>{formatRelativeTime(notification.createdAt)}</span>{!notification.readAt && <span className="inline-flex items-center gap-1 font-bold text-orange-600"><span className="h-1.5 w-1.5 rounded-full bg-orange-500"/>Não lida</span>}{unavailable && <span>Conteúdo indisponível</span>}</span></span>{destination && <ChevronRight size={18} className="shrink-0 text-stone-400"/>}</button>;
    })}</div>}
    {notificationsError && notifications.length > 0 && <p role="alert" className="mt-4 text-center text-sm font-semibold text-red-600">Não foi possível carregar mais notificações.</p>}
    {notificationsHasMore && <div className="mt-5 text-center"><Button variant="soft" onClick={() => void loadNotifications()} disabled={notificationsLoading}>{notificationsLoading ? "Carregando…" : "Carregar mais"}</Button></div>}
  </main>;
}
