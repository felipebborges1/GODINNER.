import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AppProvider } from "@/context/app-context";
export const metadata: Metadata = { title: "GODINNER — GO + DINNER", description: "Descubra onde pessoas que você conhece recomendam ir." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>; }
