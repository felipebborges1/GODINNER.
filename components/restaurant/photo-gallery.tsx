"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { RestaurantPhoto } from "@/types";
import { Modal } from "@/components/ui/modal";

export function PhotoGallery({ photos, name }: { photos: RestaurantPhoto[]; name: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const safePhotos = photos.length ? photos : [];
  const active = selected ?? 0;
  const move = (step: number) => setSelected((current) => (current === null ? 0 : (current + step + safePhotos.length) % safePhotos.length));
  if (!safePhotos.length) return null;
  return <>
    <section className="lg:grid lg:h-[430px] lg:grid-cols-3 lg:grid-rows-2 lg:gap-2 lg:overflow-hidden lg:rounded-[2rem]">
      <button onClick={() => setSelected(0)} className="relative block aspect-[4/3] w-full overflow-hidden lg:col-span-2 lg:row-span-2"><Image src={safePhotos[0].url} alt={`${name} — foto 1`} fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover"/><span className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white lg:hidden">1 / {safePhotos.length}</span></button>
      {safePhotos.slice(1, 3).map((photo, index) => <button key={photo.id} onClick={() => setSelected(index + 1)} className="relative hidden overflow-hidden lg:block"><Image src={photo.url} alt={`${name} — foto ${index + 2}`} fill sizes="33vw" className="object-cover"/></button>)}
      <div className="flex snap-x gap-2 overflow-x-auto px-4 py-3 lg:hidden">{safePhotos.slice(1).map((photo, index) => <button key={photo.id} onClick={() => setSelected(index + 1)} className="relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-2xl"><Image src={photo.url} alt={`${name} — foto ${index + 2}`} fill sizes="112px" className="object-cover"/></button>)}</div>
    </section>
    <Modal open={selected !== null} onClose={() => setSelected(null)} title={`${name} · ${active + 1} de ${safePhotos.length}`}><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100"><Image src={safePhotos[active].url} alt={`${name} — foto ${active + 1}`} fill sizes="(min-width: 640px) 560px, 90vw" className="object-cover"/>{safePhotos.length > 1 && <><button onClick={() => move(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2"><ChevronLeft/></button><button onClick={() => move(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2"><ChevronRight/></button></>}</div></Modal>
  </>;
}
