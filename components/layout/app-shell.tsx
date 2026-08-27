"use client";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./bottom-navigation";
import { DesktopHeader } from "./desktop-header";
import { ToastOutlet } from "./toast-outlet";
import { NotificationBell } from "@/components/notifications/notification-bell";
export function AppShell({ children }: { children: React.ReactNode }) { const pathname = usePathname(); const admin = pathname.startsWith("/admin"); return <>{!admin && <DesktopHeader/>}{!admin && <div className="fixed right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-40 lg:hidden"><NotificationBell mobile/></div>}<main className={admin ? "min-h-screen" : "min-h-screen pb-24 lg:pb-10"}>{children}</main>{!admin && <BottomNavigation/>}<ToastOutlet/></>; }
