import { BadgeCheck } from "lucide-react";

export function DuoGourmetIndicator() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-100"><BadgeCheck size={14} aria-hidden="true"/>Aceita Duo Gourmet</span>;
}
