"use client";

import Image from "next/image";
import { Camera, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { avatarImageRequirements } from "@/lib/supabase/storage";
import type { User } from "@/types";

type SourceImage = { file: File; url: string; width: number; height: number };

function readImage(file: File) {
  return new Promise<{ width: number; height: number; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, url });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler esta imagem.")); };
    image.src = url;
  });
}

function cropSquare(source: SourceImage, position: number) {
  return new Promise<File>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const side = Math.min(source.width, source.height);
      const maxOffset = Math.abs(source.width - source.height);
      const offset = Math.round((maxOffset * position) / 100);
      const cropX = source.width > source.height ? offset : 0;
      const cropY = source.height > source.width ? offset : 0;
      const canvas = document.createElement("canvas");
      const outputSide = Math.min(side, avatarImageRequirements.maxOutputDimension);
      canvas.width = outputSide;
      canvas.height = outputSide;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Não foi possível preparar o recorte.")); return; }
      context.drawImage(image, cropX, cropY, side, side, 0, 0, outputSide, outputSide);
      canvas.toBlob((blob) => {
        if (!blob || !avatarImageRequirements.acceptedTypes.has(blob.type)) { reject(new Error("Não foi possível preparar o recorte.")); return; }
        const extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/png" ? "png" : "webp";
        const cropped = new File([blob], `avatar.${extension}`, { type: blob.type });
        if (cropped.size > avatarImageRequirements.maxBytes) { reject(new Error("A foto processada ficou maior que 5 MB. Escolha outra imagem.")); return; }
        resolve(cropped);
      }, "image/webp", 0.86);
    };
    image.onerror = () => reject(new Error("Não foi possível preparar o recorte."));
    image.src = source.url;
  });
}

export function ProfileAvatarEditor({ user, onSave, onRemove }: { user: User; onSave: (file: File) => Promise<{ ok: boolean; error?: string }>; onRemove: () => Promise<{ ok: boolean; error?: string }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [position, setPosition] = useState(50);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);

  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);

  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    if (!avatarImageRequirements.acceptedTypes.has(file.type)) { setError("Este formato de foto não é compatível. Escolha uma foto JPG, PNG ou WebP."); return; }
    if (file.size > avatarImageRequirements.maxBytes) { setError("A imagem deve ter no máximo 5 MB."); return; }
    try {
      const metadata = await readImage(file);
      if (metadata.width < avatarImageRequirements.minDimension || metadata.height < avatarImageRequirements.minDimension) {
        URL.revokeObjectURL(metadata.url);
        setError("A imagem precisa ter pelo menos 320 × 320 pixels.");
        return;
      }
      setSource((current) => { if (current) URL.revokeObjectURL(current.url); return { file, ...metadata }; });
      setPosition(50);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Não foi possível ler esta imagem."); }
  }

  async function save() {
    if (!source || busy) return;
    setBusy("save"); setError("");
    try {
      const cropped = await cropSquare(source, position);
      const result = await onSave(cropped);
      if (!result.ok) { setError(result.error ?? "Não foi possível salvar sua foto."); return; }
      URL.revokeObjectURL(source.url); setSource(null);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Não foi possível salvar sua foto."); }
    finally { setBusy(null); }
  }

  async function remove() {
    if (busy) return;
    setBusy("remove"); setError("");
    const result = await onRemove();
    if (!result.ok) setError(result.error ?? "Não foi possível remover sua foto.");
    setBusy(null);
  }

  const isLandscape = Boolean(source && source.width > source.height);
  const isPortrait = Boolean(source && source.height > source.width);
  const objectPosition = source ? `${isLandscape ? position : 50}% ${isPortrait ? position : 50}%` : "50% 50%";

  return <div className="relative shrink-0">
    <button type="button" onClick={() => inputRef.current?.click()} className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2" aria-label={user.avatar ? "Alterar foto de perfil" : "Adicionar foto de perfil"}>
      <UserAvatar src={user.avatar} name={user.name} size="lg"/>
      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-orange-500 text-white shadow-sm ring-2 ring-white transition group-hover:bg-orange-600"><Camera size={14}/></span>
    </button>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])}/>
    <div className="absolute left-0 top-full z-10 mt-3 flex w-max flex-wrap gap-2">
      <button type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)} className="min-h-10 rounded-full bg-stone-100 px-3 text-xs font-black text-stone-800 transition hover:bg-stone-200 disabled:opacity-60">{user.avatar ? "Alterar foto" : "Adicionar foto"}</button>
      {user.avatar && <button type="button" onClick={() => void remove()} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-black text-stone-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60">{busy === "remove" ? <LoaderCircle className="animate-spin" size={14}/> : <Trash2 size={14}/>}Remover foto</button>}
    </div>
    {source && <div role="dialog" aria-modal="true" aria-label="Ajustar foto de perfil" className="fixed inset-0 z-50 grid place-items-end bg-stone-950/45 p-0 sm:place-items-center sm:p-6">
      <section className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">Ajustar foto</h2><p className="mt-1 text-sm text-stone-500">A foto será salva em 1:1 e exibida em círculo.</p></div><button type="button" onClick={() => { URL.revokeObjectURL(source.url); setSource(null); }} disabled={Boolean(busy)} className="grid h-10 w-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100" aria-label="Fechar ajuste de foto"><X size={20}/></button></div>
        <div className="relative mx-auto mt-5 aspect-square w-full max-w-[300px] overflow-hidden rounded-3xl bg-stone-100"><Image src={source.url} alt="Prévia da foto de perfil" fill unoptimized sizes="300px" className="object-cover" style={{ objectPosition }}/></div>
        {source.width !== source.height && <label className="mt-5 block text-sm font-bold">{isLandscape ? "Ajustar horizontalmente" : "Ajustar verticalmente"}<input aria-label={isLandscape ? "Posição horizontal" : "Posição vertical"} type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} className="mt-3 w-full accent-orange-500"/></label>}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="button" onClick={() => void save()} disabled={Boolean(busy)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60">{busy === "save" && <LoaderCircle className="animate-spin" size={16}/>}{busy === "save" ? "Salvando foto…" : "Salvar foto"}</button>
      </section>
    </div>}
    {error && !source && <p role="alert" className="mt-2 max-w-56 text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}
