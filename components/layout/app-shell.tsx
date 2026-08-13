"use client";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./bottom-navigation";
import { DesktopHeader } from "./desktop-header";
import { ToastOutlet } from "./toast-outlet";
export function AppShell({ children }: { children: React.ReactNode }) { const pathname = usePathname(); const admin = pathname.startsWith("/admin"); return <>{!admin && <DesktopHeader/>}<main className={admin ? "min-h-screen" : "min-h-screen pb-24 lg:pb-10"}>{children}</main>{!admin && <BottomNavigation/>}<ToastOutlet/></>; }
