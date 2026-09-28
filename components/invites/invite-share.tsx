"use client";

import { useEffect, useRef, useState } from "react";
import { INVITE_MESSAGE, isShareCancellation } from "@/lib/invite-sharing";

export function InviteShare({ onClose, initialUrl }: { onClose: () => void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(initialUrl ? "ready" : "loading");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialUrl) return;
    let active = true;
    fetch("/api/invites/me", { method: "POST", cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("unavailable");
      const data: { url?: string } = await response.json();
      if (!data.url) throw new Error("unavailable");
      if (active) { setUrl(data.url); setStatus("ready"); }
    }).catch(() => { if (active) setStatus("unavailable"); });
    return () => { active = false; };
  }, [initialUrl]);

  async function share() {
    if (!url || !navigator.share) return;
    try { setShareFailed(false); await navigator.share({ text: INVITE_MESSAGE, url }); }
    catch (error) { if (!isShareCancellation(error)) setShareFailed(true); }
  }

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setCopyFailed(false); }
    catch { setCopyFailed(true); inputRef.current?.focus(); inputRef.current?.select(); }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 px-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="invite-share-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-orange-600">GODINNER</p><h2 id="invite-share-title" className="mt-1 text-2xl font-black">Convidar amigos</h2></div><button type="button" aria-label="Fechar" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-stone-100 text-xl">×</button></div>
      <p className="mt-4 text-sm leading-6 text-stone-600">{INVITE_MESSAGE}</p>
      {status === "loading" && <p role="status" className="mt-5 text-sm text-stone-600">Preparando seu link…</p>}
      {status === "unavailable" && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Seu link ainda não está disponível. Tente novamente mais tarde.</p>}
      {status === "ready" && <><label htmlFor="personal-invite-url" className="mt-5 block text-sm font-bold">Seu link pessoal</label><input id="personal-invite-url" ref={inputRef} readOnly value={url} onFocus={event => event.currentTarget.select()} className="input mt-2 w-full select-all text-stone-700"/>
        <div className="mt-4 flex flex-wrap gap-3">{typeof navigator !== "undefined" && "share" in navigator && <button type="button" onClick={() => void share()} className="min-h-11 rounded-full bg-orange-600 px-5 text-sm font-black text-white">Compartilhar</button>}<button type="button" onClick={() => void copy()} className="min-h-11 rounded-full border border-stone-300 px-5 text-sm font-black">Copiar link</button></div>
        {copied && <p role="status" className="mt-3 text-sm font-bold text-green-700">Link copiado!</p>}{shareFailed && <p role="status" className="mt-3 text-sm text-stone-600">Não foi possível compartilhar. Você pode copiar o link.</p>}{copyFailed && <p role="status" className="mt-3 text-sm text-stone-600">Não foi possível copiar automaticamente. Selecione o endereço acima para copiar manualmente.</p>}
      </>}
    </section>
  </div>;
}
