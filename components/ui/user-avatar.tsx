"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/user-initials";

export { getUserInitials } from "@/lib/user-initials";

function avatarTone(name?: string | null) {
  const total = Array.from((name ?? "").trim()).reduce((value, character) => value + character.codePointAt(0)!, 0);
  return ["bg-orange-500", "bg-amber-600", "bg-rose-500", "bg-stone-700"][total % 4];
}

export function UserAvatar({ src, name, size = "md", className }: { src?: string | null; name?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failedToLoad = Boolean(src && failedSource === src);
  const dimension = size === "sm" ? 32 : size === "md" ? 40 : 64;
  const sizeClass = size === "sm" ? "h-8 w-8 text-[11px]" : size === "md" ? "h-10 w-10 text-xs" : "h-16 w-16 text-lg";
  if (!src || failedToLoad) return <span role="img" aria-label={`Avatar de ${name || "usuário"} com as iniciais ${getUserInitials(name)}`} className={cn("inline-grid shrink-0 place-items-center rounded-full font-black text-white ring-2 ring-white", sizeClass, avatarTone(name), className)}>{getUserInitials(name)}</span>;
  return <Image src={src} alt={name || "Avatar"} width={dimension} height={dimension} unoptimized onError={() => setFailedSource(src)} className={cn("shrink-0 rounded-full object-cover ring-2 ring-white", sizeClass, className)} />;
}
