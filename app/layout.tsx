import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AppProvider } from "@/context/app-context";
import { ExploreLocationProvider } from "@/context/explore-location-context";
export const metadata: Metadata = { title: "GODINNER — GO + DINNER", description: "Descubra onde pessoas que você conhece recomendam ir." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><AppProvider><ExploreLocationProvider><AppShell>{children}</AppShell></ExploreLocationProvider></AppProvider></body></html>; }
