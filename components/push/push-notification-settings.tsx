"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppContext } from "@/hooks/use-app-context";

type PushConfig = { enabled: boolean; vapidPublicKey?: string };

function publicKeyToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotificationSettings() {
  const { showToast } = useAppContext();
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    void fetch("/api/push/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<PushConfig> : { enabled: false })
      .then(async (next) => {
        if (!current) return;
        setConfig(next);
        if (!next.enabled || !("serviceWorker" in navigator)) return;
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (current) setActive(Boolean(await registration?.pushManager.getSubscription()));
      })
      .catch(() => { if (current) setConfig({ enabled: false }); });
    return () => { current = false; };
  }, []);

  const activate = async () => {
    if (!config?.enabled || !config.vapidPublicKey) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) { showToast("Notificações não são compatíveis com este navegador."); return; }
    if (Notification.permission === "denied") { showToast("As notificações estão bloqueadas neste navegador."); return; }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { if (permission === "denied") showToast("Você pode liberar notificações nas configurações do navegador."); return; }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKeyToBytes(config.vapidPublicKey) });
      const response = await fetch("/api/push/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("subscription_failed");
      setActive(true);
      showToast("Notificações ativadas neste dispositivo.");
    } catch { showToast("Não foi possível ativar as notificações agora."); }
    finally { setBusy(false); }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
        await subscription.unsubscribe();
      }
      setActive(false);
      showToast("Notificações desativadas neste dispositivo.");
    } catch { showToast("Não foi possível desativar as notificações agora."); }
    finally { setBusy(false); }
  };

  if (!config?.enabled) return null;
  return <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black">Notificações</p><p className="mt-1 text-sm leading-6 text-stone-600">Receba um aviso quando alguém começar a seguir você.</p></div>{active ? <Bell className="shrink-0 text-orange-500"/> : <BellOff className="shrink-0 text-stone-400"/>}</div><button type="button" disabled={busy} onClick={() => void (active ? deactivate() : activate())} className={`mt-4 min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-60 ${active ? "bg-stone-100 text-stone-700" : "bg-stone-950 text-white"}`}>{busy ? "Aguarde…" : active ? "Desativar notificações" : "Ativar notificações"}</button></section>;
}
