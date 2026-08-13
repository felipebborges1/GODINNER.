"use client";

import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import type { RestaurantPhoto } from "@/types";

export function PhotoUploader({ photos, onChange }: { photos: RestaurantPhoto[]; onChange: (photos: RestaurantPhoto[]) => void }) {
  const addFiles = (files: FileList | null) => {
    const selected = Array.from(files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 5 - photos.length);
    const created = selected.map((file) => ({ id: `local-${crypto.randomUUID()}`, url: URL.createObjectURL(file), alt: "Foto local da experiência" }));
    onChange([...photos, ...created]);
  };
  const remove = (id: string) => { const item = photos.find((photo) => photo.id === id); if (item?.url.startsWith("blob:")) URL.revokeObjectURL(item.url); onChange(photos.filter((photo) => photo.id !== id)); };
  return <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-black">Mostre o que você comeu</label><span className="text-xs font-bold text-stone-500">{photos.length}/5 fotos</span></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{photos.map((photo) => <div key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl"><Image src={photo.url} alt={photo.alt} fill unoptimized sizes="140px" className="object-cover"/><button type="button" onClick={() => remove(photo.id)} aria-label="Remover foto" className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X size={14}/></button></div>)}{photos.length < 5 && <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-center text-xs font-bold text-stone-500"><ImagePlus size={20}/><span className="mt-1">Adicionar</span><input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }}/></label>}</div></div>;
}
