export const PROFILE_BIO_LIMIT = 150;

export function countProfileCharacters(value: string) {
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(value)].length;
  }
  return Array.from(value).length;
}

export function validateProfileBio(value: unknown) {
  if (typeof value !== "string") return { value: "", error: "Informe uma bio válida." };
  if (countProfileCharacters(value) > PROFILE_BIO_LIMIT) return { value, error: `A bio deve ter até ${PROFILE_BIO_LIMIT} caracteres.` };
  return { value, error: null };
}

export function normalizeProfileLink(value: unknown) {
  if (typeof value !== "string") return { value: null, error: "Informe um link válido." };
  const input = value.trim();
  if (!input) return { value: null, error: null };
  if (input.length > 2048 || /[\s\u0000-\u001f]/u.test(input)) return { value: null, error: "Informe um link válido, sem espaços." };
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input) && !/^[\w.-]+:\d+(?:\/|$)/i.test(input);
  try {
    const url = new URL(hasScheme ? input : `https://${input}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".") || url.hostname.endsWith(".")) {
      return { value: null, error: "Use um endereço HTTP ou HTTPS válido." };
    }
    return { value: url.href, error: null };
  } catch {
    return { value: null, error: "Informe um link válido, como seusite.com.br." };
  }
}

export function readableProfileLink(value: string) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}${url.search}${url.hash}`;
  } catch { return value; }
}
