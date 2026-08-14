import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center"><MapPin className="mx-auto mb-3 text-orange-500" aria-hidden="true"/><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-stone-500">{message}</p>{actionLabel && actionHref && <Button href={actionHref} className="mt-5">{actionLabel}</Button>}{actionLabel && onAction && <Button onClick={onAction} className="mt-5">{actionLabel}</Button>}</div>;
}
