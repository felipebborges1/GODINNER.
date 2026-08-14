"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }
  return <button type="button" onClick={logout} disabled={busy} className="min-h-11 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 disabled:opacity-60">{busy ? "Saindo…" : "Sair"}</button>;
}
