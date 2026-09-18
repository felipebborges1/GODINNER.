import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AppProvider } from "@/context/app-context";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, isPreview } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "GODINNER",
  robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: { type: "website", locale: "pt_BR", siteName: "GODINNER", title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>; }
