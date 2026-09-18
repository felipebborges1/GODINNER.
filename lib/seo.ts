export const SITE_URL = "https://www.godinner.com.br";
export const SITE_TITLE = "GODINNER — Descubra restaurantes com quem você confia";
export const SITE_DESCRIPTION = "Descubra restaurantes, compartilhe suas experiências e encontre seu próximo lugar pelas avaliações de amigos e da comunidade GODINNER.";
export const isPreview = process.env.VERCEL_ENV === "preview";

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
