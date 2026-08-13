"use client";
import { CheckCircle2, X } from "lucide-react";
export function Toast({ open, onClose, message = "Pronto!" }: { open: boolean; onClose: () => void; message?: string }) { if (!open) return null; return <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white shadow-xl"><CheckCircle2 className="text-orange-400" size={19}/>{message}<button className="ml-auto" onClick={onClose}><X size={17}/></button></div>; }
