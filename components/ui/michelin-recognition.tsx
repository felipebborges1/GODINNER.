import { Award } from "lucide-react";
import { hasVerifiedMichelinStars, michelinLabel } from "@/lib/michelin";
import type { MichelinRecognition } from "@/types";

export function MichelinRecognitionBadge({ recognition }: { recognition: MichelinRecognition | undefined }) {
  const label = recognition ? michelinLabel(recognition) : null;
  if (!label) return null;
  return <span aria-label={`Reconhecimento Michelin: ${label}`} className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-2.5 py-1 text-xs font-bold text-white"><Award size={13} aria-hidden="true"/>{label}</span>;
}

export function MichelinRecognitionSource({ recognition }: { recognition: MichelinRecognition | undefined }) {
  if (!recognition || !hasVerifiedMichelinStars(recognition)) return null;
  const label = michelinLabel(recognition);
  return <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Reconhecimento</p><p className="mt-2 font-black">{label}</p><p className="mt-1 text-xs text-stone-500">Informação verificada para esta unidade.</p><a href={recognition.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-orange-700 underline underline-offset-4">Ver fonte oficial no Guia Michelin</a></section>;
}
