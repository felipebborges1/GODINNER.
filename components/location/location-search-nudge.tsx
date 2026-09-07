"use client";

import { useExploreLocation } from "@/hooks/use-explore-location";

type Props = { onDeviceSelected?: () => void };

export function LocationSearchNudge({ onDeviceSelected }: Props) {
  const { locationNudgeVisible, requestStatus, requestDeviceLocation, dismissLocationNudge } = useExploreLocation();
  if (!locationNudgeVisible) return null;
  const useDevice = async () => {
    const success = await requestDeviceLocation();
    if (success) onDeviceSelected?.();
    dismissLocationNudge();
  };
  return <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 shadow-sm" role="status">
    <span>Quer encontrar lugares perto de você?</span>
    <button type="button" onClick={() => void useDevice()} disabled={requestStatus === "requesting"} className="font-black text-orange-600 disabled:opacity-60">{requestStatus === "requesting" ? "Localizando…" : "Usar minha localização"}</button>
    <button type="button" onClick={dismissLocationNudge} className="font-bold text-stone-500">Agora não</button>
  </div>;
}
