"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/hooks/use-toast";

export function BetaFeedback() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("Bug");
  const [message, setMessage] = useState("");
  const submit = () => {
    if (!message.trim()) return;
    if (typeof window !== "undefined") {
      const current = JSON.parse(window.localStorage.getItem("godinner:beta-feedback") ?? "[]") as unknown[];
      current.push({ kind, message: message.trim(), path: pathname, createdAt: new Date().toISOString() });
      window.localStorage.setItem("godinner:beta-feedback", JSON.stringify(current));
    }
    setMessage("");
    setOpen(false);
    showToast("Feedback recebido. Obrigado!");
  };
  return <><button type="button" onClick={() => setOpen(true)} className="text-sm font-bold text-stone-600 underline decoration-stone-300 underline-offset-4">Enviar feedback</button><BottomSheet open={open} onClose={() => setOpen(false)} title="Enviar feedback"><div className="space-y-4"><label className="block text-sm font-bold">Tipo<select value={kind} onChange={(event) => setKind(event.target.value)} className="input mt-2"><option>Bug</option><option>Sugestão</option><option>Dúvida</option></select></label><label className="block text-sm font-bold">Mensagem<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="O que aconteceu?" className="input mt-2 min-h-28"/></label><button type="button" onClick={submit} disabled={!message.trim()} className="min-h-12 w-full rounded-2xl bg-stone-950 text-sm font-black text-white disabled:opacity-50">Enviar</button></div></BottomSheet></>;
}
