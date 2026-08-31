"use client";
import Link from "next/link";
import { CircleUserRound, Compass, List, Plus, Rss } from "lucide-react";
import { usePathname } from "next/navigation";
const items = [{href:"/",label:"Discover",icon:Compass},{href:"/feed",label:"Feed",icon:Rss},{href:"/lists",label:"Listas",icon:List},{href:"/profile",label:"Perfil",icon:CircleUserRound}];
export function BottomNavigation() { const path = usePathname(); return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"><div className="mx-auto flex max-w-md items-end justify-between">{items.slice(0,2).map(i=><NavLink key={i.href} {...i} active={path===i.href}/>)}<Link href="/review/new" aria-label="Avaliar experiência" className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30"><Plus size={26}/></Link>{items.slice(2).map(i=><NavLink key={i.href} {...i} active={path===i.href}/>)}</div></nav>; }
function NavLink({href,label,icon:Icon,active}:{href:string;label:string;icon:typeof Compass;active:boolean}) { return <Link href={href} className={`grid min-w-12 place-items-center gap-1 text-[10px] font-semibold ${active?"text-orange-500":"text-stone-400"}`}><Icon size={21}/>{label}</Link>; }
