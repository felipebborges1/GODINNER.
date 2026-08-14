"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

export function DesktopHeader() {
  const { currentUserId, users, dataMode } = useAppContext();
  const currentUser = users.find((user) => user.id === currentUserId);
  return <header className="sticky top-0 z-40 hidden border-b border-stone-200 bg-white/90 backdrop-blur lg:block"><div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6"><Brand/><nav className="flex gap-7 text-sm font-semibold text-stone-600"><Link href="/">Discover</Link><Link href="/feed">Feed</Link><Link href="/lists">Listas</Link></nav><div className="flex items-center gap-4"><Button href="/review/new"><Plus size={16}/>Registrar</Button><Link href="/search" aria-label="Abrir busca" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-stone-200 dark:hover:bg-stone-800"><Search size={20}/></Link><Link href="/profile"><UserAvatar src={currentUser?.avatar ?? "https://i.pravatar.cc/160?img=47"} name={currentUser?.name ?? "Perfil"} size="sm"/></Link>{dataMode === "supabase" && <LogoutButton/>}</div></div></header>;
}
