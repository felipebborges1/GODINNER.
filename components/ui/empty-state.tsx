import Link from "next/link";
import { MapPin } from "lucide-react";

export function EmptyState({
  title = "Nada por aqui ainda",
  message = "Tente ajustar sua busca ou volte em breve.",
  actionLabel,
  actionHref,
  onAction,
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center"><MapPin className="mx-auto mb-3 text-orange-500" aria-hidden="true"/><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-stone-500">{message}</p>{actionLabel && actionHref && <Link href={actionHref} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-stone-950 px-4 text-sm font-bold text-white">{actionLabel}</Link>}{actionLabel && onAction && <button type="button" onClick={onAction} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-stone-950 px-4 text-sm font-bold text-white">{actionLabel}</button>}</div>;
}
