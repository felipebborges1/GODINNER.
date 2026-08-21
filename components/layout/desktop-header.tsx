"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

export function DesktopHeader() {
  const { currentUserId, users, isAuthLoading } = useAppContext();
  const currentUser = currentUserId ? users.find((user) => user.id === currentUserId) : undefined;
  return <header className="sticky top-0 z-40 hidden border-b border-stone-200 bg-white/90 backdrop-blur lg:block"><div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6"><Brand/><nav className="flex gap-7 text-sm font-semibold text-stone-600"><Link href="/">Discover</Link><Link href="/feed">Feed</Link><Link href="/lists">Listas</Link></nav><div className="flex min-h-11 items-center gap-4" aria-busy={isAuthLoading}>
    {isAuthLoading ? <span className="h-10 w-28 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800" aria-label="Carregando autenticação" /> : currentUserId ? <>
      <Link href="/search" aria-label="Abrir busca" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-stone-200 dark:hover:bg-stone-800"><Search size={20}/></Link>
      <Link href="/profile"><UserAvatar src={currentUser?.avatar} name={currentUser?.name ?? "Perfil"} size="sm"/></Link>
      <LogoutButton/>
    </> : <>
      <Button href="/review/new"><Plus size={16}/>Registrar</Button>
      <Link href="/search" aria-label="Abrir busca" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-stone-200 dark:hover:bg-stone-800"><Search size={20}/></Link>
      <Link href="/login" className="rounded-full border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">Entrar</Link>
    </>}
  </div></div></header>;
}
