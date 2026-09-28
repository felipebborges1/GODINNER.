"use client";

import Image from "next/image";
import { LoaderCircle, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cropProfileImage, readProfileImage, type SourceImage } from "@/lib/profile-avatar-image";
import { countProfileCharacters, normalizeProfileLink, PROFILE_BIO_LIMIT } from "@/lib/profile-fields";
import { avatarImageRequirements } from "@/lib/supabase/storage";
import type { ProfileEditDraft } from "@/context/app-context";
import type { User } from "@/types";

export function ProfileEditor({ user, onSave, onClose }: { user: User; onSave: (draft: ProfileEditDraft) => Promise<{ ok: boolean; error?: string }>; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [position, setPosition] = useState(50);
  const [avatarAction, setAvatarAction] = useState<ProfileEditDraft["avatarAction"]>("keep");
  const [bio, setBio] = useState(user.bio ?? "");
  const [website, setWebsite] = useState(user.website ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const count = countProfileCharacters(bio);
  const dirty = bio !== (user.bio ?? "") || website !== (user.website ?? "") || avatarAction !== "keep";
  const preview = avatarAction === "remove" ? null : source?.url ?? user.avatar;
  const isLandscape = Boolean(source && source.width > source.height);
  const isPortrait = Boolean(source && source.height > source.width);
  const objectPosition = source ? `${isLandscape ? position : 50}% ${isPortrait ? position : 50}%` : "50% 50%";

  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warnOnLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnOnLeave);
    return () => window.removeEventListener("beforeunload", warnOnLeave);
  }, [dirty]);
  useEffect(() => { if (confirmDiscard) continueRef.current?.focus(); }, [confirmDiscard]);

  const requestClose = () => { if (savingRef.current) return; if (dirty) setConfirmDiscard(true); else onClose(); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); if (confirmDiscard) setConfirmDiscard(false); else requestClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]') ?? [])].filter((item) => item.offsetParent !== null && (!confirmDiscard || item.closest('[data-discard-dialog]')));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!focusable.includes(document.activeElement as HTMLElement)) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    if (!avatarImageRequirements.acceptedTypes.has(file.type)) { setError("Escolha uma foto JPG, PNG ou WebP."); return; }
    if (file.size > avatarImageRequirements.maxBytes) { setError("A imagem deve ter no máximo 5 MB."); return; }
    try {
      const image = await readProfileImage(file);
      if (image.width < avatarImageRequirements.minDimension || image.height < avatarImageRequirements.minDimension) {
        URL.revokeObjectURL(image.url);
        setError("A imagem precisa ter pelo menos 320 × 320 pixels.");
        return;
      }
      setSource(image);
      setAvatarAction("replace");
      setPosition(50);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível ler esta imagem."); }
  }

  function removePhoto() {
    setSource(null);
    setAvatarAction(user.avatar ? "remove" : "keep");
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    if (count > PROFILE_BIO_LIMIT) { setError(`A bio deve ter até ${PROFILE_BIO_LIMIT} caracteres.`); return; }
    const link = normalizeProfileLink(website);
    if (link.error) { setError(link.error); return; }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const file = avatarAction === "replace" && source ? await cropProfileImage(source, position) : null;
      const result = await onSave({ bio, website: link.value ?? "", avatarAction, file });
      if (!result.ok) { setError(result.error ?? "Não foi possível salvar o perfil."); return; }
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o perfil."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return <div role="presentation" className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/50 sm:grid sm:place-items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" onKeyDown={onKeyDown} className="relative min-h-dvh w-full bg-white shadow-2xl sm:my-auto sm:min-h-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-xl sm:overflow-y-auto sm:rounded-3xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-100 bg-white px-5 py-4 sm:px-7"><div><p className="text-xs font-black uppercase tracking-wide text-orange-600">GODINNER</p><h2 id="profile-editor-title" className="text-xl font-black">Editar perfil</h2></div><button ref={closeRef} type="button" onClick={requestClose} disabled={saving} aria-label="Fechar editor" className="grid min-h-11 min-w-11 place-items-center rounded-full text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-orange-500"><X size={22}/></button></div>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-[calc(100dvh-78px)] flex-col sm:min-h-0">
        <div className="flex-1 space-y-6 px-5 py-6 sm:px-7">
          <section aria-label="Foto do perfil" className="flex items-center gap-5">
            <div className="relative shrink-0"><div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-stone-100 ring-4 ring-orange-50">
              {source && avatarAction === "replace" ? <Image src={source.url} alt="Prévia da nova foto" width={112} height={112} unoptimized className="h-28 w-28 object-cover" style={{ objectPosition }}/> : <UserAvatar src={preview} name={user.name} size="lg" className="!h-28 !w-28 !text-2xl"/>}
            </div><button type="button" onClick={() => fileRef.current?.click()} disabled={saving} aria-label="Alterar foto" className="absolute -bottom-1 -right-1 grid min-h-11 min-w-11 place-items-center rounded-full bg-orange-500 text-white shadow-md ring-2 ring-white focus-visible:outline-2 focus-visible:outline-orange-600 disabled:opacity-50"><Pencil size={18}/></button>{preview && <button type="button" onClick={removePhoto} disabled={saving} aria-label="Remover foto" className="absolute -right-1 -top-1 grid min-h-11 min-w-11 place-items-center rounded-full bg-stone-900 text-white shadow-md ring-2 ring-white focus-visible:outline-2 focus-visible:outline-stone-800 disabled:opacity-50"><X size={19}/></button>}</div>
            <div className="min-w-0"><p className="font-black">Sua foto</p><p className="mt-1 text-sm leading-5 text-stone-600">Toque no lápis para adicionar ou trocar. A imagem só muda ao salvar.</p></div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} className="sr-only" aria-label="Selecionar foto" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
          </section>
          {source && source.width !== source.height && <label className="block text-sm font-bold">{isLandscape ? "Ajustar foto horizontalmente" : "Ajustar foto verticalmente"}<input type="range" min="0" max="100" value={position} disabled={saving} onChange={(event) => setPosition(Number(event.target.value))} className="mt-3 w-full accent-orange-500"/></label>}
          <div><label htmlFor="profile-bio" className="block text-sm font-black">Bio <span className="font-normal text-stone-500">(opcional)</span></label><textarea id="profile-bio" rows={4} value={bio} disabled={saving} onChange={(event) => setBio(event.target.value)} aria-describedby="profile-bio-count" aria-invalid={count > PROFILE_BIO_LIMIT} placeholder="Conte um pouco sobre você" className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"/><p id="profile-bio-count" className={`mt-1 text-right text-xs font-bold ${count > PROFILE_BIO_LIMIT ? "text-red-700" : "text-stone-500"}`}>{count}/{PROFILE_BIO_LIMIT}</p></div>
          <div><label htmlFor="profile-link" className="block text-sm font-black">Link <span className="font-normal text-stone-500">(opcional)</span></label><input id="profile-link" type="text" inputMode="url" autoCapitalize="off" autoCorrect="off" value={website} disabled={saving} onChange={(event) => setWebsite(event.target.value)} placeholder="seusite.com.br" className="mt-2 min-h-12 w-full min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"/><p className="mt-1 text-xs text-stone-500">Você pode digitar o domínio; adicionamos https:// ao salvar.</p></div>
          {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}><button type="button" onClick={requestClose} disabled={saving} className="min-h-12 rounded-2xl px-5 text-sm font-black text-stone-700 hover:bg-stone-100 disabled:opacity-50">Cancelar</button><button type="submit" disabled={saving || count > PROFILE_BIO_LIMIT} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">{saving && <LoaderCircle size={18} className="animate-spin"/>}{saving ? "Salvando…" : "Salvar alterações"}</button></div>
      </form>
      {confirmDiscard && <div data-discard-dialog className="absolute inset-0 z-20 grid place-items-center bg-stone-950/50 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="discard-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"><h3 id="discard-title" className="text-lg font-black">Descartar alterações?</h3><p className="mt-2 text-sm leading-6 text-stone-600">Nada foi salvo no seu perfil.</p><div className="mt-5 flex flex-col gap-2"><button ref={continueRef} type="button" onClick={() => setConfirmDiscard(false)} className="min-h-11 rounded-xl bg-stone-950 px-4 text-sm font-black text-white">Continuar editando</button><button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-bold text-stone-700">Descartar alterações</button></div></div></div>}
    </div>
  </div>;
}
