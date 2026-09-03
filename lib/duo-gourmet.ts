import "server-only";

import { normalize } from "@/lib/search";

export type DuoGourmetMatch = "HIGH" | "MEDIUM" | "LOW" | "NO_MATCH" | "ERROR";
export type DuoGourmetVerification = { match: DuoGourmetMatch; acceptsDuoGourmet: boolean | null; checked: boolean };
export type DuoRestaurantSignal = { name: string; address: string; city: string; neighborhood?: string };
export type DuoGourmetSource = { partners: DuoRestaurantSignal[]; complete: boolean };

// Controlled public-source snapshot for the Beta. Expand only after an auditable catalog review.
const confirmedPartners: DuoRestaurantSignal[] = [
  { name: "Akane Cozinha Japonesa", address: "José Maria Alkimin, 86", city: "Belo Horizonte", neighborhood: "Belvedere" },
  { name: "Benvindo", address: "Espírito Santo, 2488", city: "Belo Horizonte", neighborhood: "Lourdes" },
  { name: "Kei", address: "Oscar Niemeyer, 891", city: "Nova Lima", neighborhood: "Vila da Serra" },
  { name: "Valle Gastronômico", address: "Santa Rita, 221", city: "Belo Horizonte", neighborhood: "Olhos d'Água" },
];

export const controlledDuoGourmetSource: DuoGourmetSource = { partners: confirmedPartners, complete: false };

function sameName(candidate: string, partner: string) {
  const left = normalize(candidate);
  const right = normalize(partner);
  return left === right || left.includes(right) || right.includes(left);
}

export function verifyDuoGourmet(restaurant: DuoRestaurantSignal, source: DuoGourmetSource = controlledDuoGourmetSource): DuoGourmetVerification {
  try {
    const match = source.partners.find((partner) =>
      normalize(partner.city) === normalize(restaurant.city)
      && sameName(restaurant.name, partner.name)
      && normalize(restaurant.address).includes(normalize(partner.address)),
    );
    if (match) return { match: "HIGH", acceptsDuoGourmet: true, checked: true };
    if (source.complete) return { match: "NO_MATCH", acceptsDuoGourmet: false, checked: true };
    // This is a curated subset, not a complete negative source. Absence remains unknown.
    return { match: "NO_MATCH", acceptsDuoGourmet: null, checked: false };
  } catch {
    return { match: "ERROR", acceptsDuoGourmet: null, checked: false };
  }
}
