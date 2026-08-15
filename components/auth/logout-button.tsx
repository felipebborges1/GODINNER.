"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      showToast("N\u00e3o foi poss\u00edvel sair agora.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch {
      showToast("N\u00e3o foi poss\u00edvel sair agora.");
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" onClick={logout} disabled={busy} className="min-h-11 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 disabled:opacity-60">{busy ? "Saindo..." : "Sair"}</button>;
}
