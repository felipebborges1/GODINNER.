"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function LoginWall({ open, onClose, next = "/" }: { open: boolean; onClose: () => void; next?: string }) {
  const query = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <Modal open={open} onClose={onClose} title="Entre para continuar">
      <p className="text-sm leading-6 text-stone-600">
        Salve lugares, compartilhe experiências e descubra onde seus amigos estão indo.
      </p>
      <div className="mt-6 grid gap-3">
        <Button href={`/login${query}`} onClick={onClose} className="min-h-12 w-full rounded-2xl">Entrar</Button>
        <Button href={`/register${query}`} onClick={onClose} variant="accent" className="min-h-12 w-full rounded-2xl">Criar conta</Button>
        <Button type="button" onClick={onClose} variant="soft" className="w-full rounded-2xl">Agora não</Button>
      </div>
    </Modal>
  );
}
