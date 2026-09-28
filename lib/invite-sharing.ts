export const INVITE_MESSAGE = "Vem pro GODINNER! 🍽️ Vamos compartilhar nossas descobertas e encontrar lugares para conhecer juntos.";

export function isShareCancellation(error: unknown) {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}
