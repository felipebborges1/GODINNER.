import Link from "next/link";

export function FilterChip({ label, active = false, href, onClick }: { label: string; active?: boolean; href?: string; onClick?: () => void }) {
  const className = `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${active ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-600"}`;
  if (href) return <Link href={href} className={className}>{label}</Link>;
  return <button onClick={onClick} className={className}>{label}</button>;
}
