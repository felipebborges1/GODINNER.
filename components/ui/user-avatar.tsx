import Image from "next/image";
import { cn } from "@/lib/utils";
export function UserAvatar({ src, name, size = "md" }: { src: string; name: string; size?: "sm" | "md" | "lg" }) { const dimension = size === "sm" ? 32 : size === "md" ? 40 : 64; return <Image src={src} alt={name} width={dimension} height={dimension} className={cn("rounded-full object-cover ring-2 ring-white",size==="sm"&&"h-8 w-8",size==="md"&&"h-10 w-10",size==="lg"&&"h-16 w-16")} />; }
