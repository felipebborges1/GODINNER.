"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";

export function LoginWall({ open, onClose, next = "/" }: { open: boolean; onClose: () => void; next?: string }) {
  const query = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <Modal open={open} onClose={onClose} title="Entre para continuar">
      <p className="text-sm leading-6 text-stone-600">
        Salve lugares, compartilhe experiências e descubra onde seus amigos estão indo.
      </p>
      <div className="mt-6 grid gap-3">
        <Link href={`/login${query}`} className="flex min-h-12 items-center justify-center rounded-2xl bg-stone-950 px-4 text-sm font-black text-white" onClick={onClose}>
          Entrar
        </Link>
        <Link href={`/register${query}`} className="flex min-h-12 items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-black text-white" onClick={onClose}>
          Criar conta
        </Link>
        <button type="button" onClick={onClose} className="min-h-11 rounded-2xl bg-stone-100 px-4 text-sm font-bold text-stone-700">
          Agora não
        </button>
      </div>
    </Modal>
  );
}
