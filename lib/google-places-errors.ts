export type GooglePlacesFailureCode = "configuration" | "credential" | "quota" | "timeout" | "invalid_request" | "invalid_response" | "service";

export class GooglePlacesRequestError extends Error {
  public readonly code: GooglePlacesFailureCode;
  public readonly upstreamStatus?: number;
  public readonly retryAfterSeconds?: number;
  public readonly networkCode?: string;

  constructor(
    code: GooglePlacesFailureCode,
    upstreamStatus?: number,
    retryAfterSeconds?: number,
    networkCode?: string,
  ) {
    super(code);
    this.name = "GooglePlacesRequestError";
    this.code = code;
    this.upstreamStatus = upstreamStatus;
    this.retryAfterSeconds = retryAfterSeconds;
    this.networkCode = networkCode;
  }
}

/** Returns only a compact transport code; network messages can contain host details. */
export function networkFailureCode(error: unknown) {
  const candidate = error && typeof error === "object" && "cause" in error
    ? (error as { cause?: unknown }).cause
    : undefined;
  const code = candidate && typeof candidate === "object" && "code" in candidate
    ? (candidate as { code?: unknown }).code
    : undefined;
  return typeof code === "string" && /^[A-Z0-9_-]{2,32}$/.test(code) ? code : undefined;
}

export function googlePlacesFailureFromUnknown(error: unknown) {
  return error instanceof GooglePlacesRequestError
    ? error
    : new GooglePlacesRequestError("service");
}

export function googlePlacesFailureMessage(code: GooglePlacesFailureCode, retryAfterSeconds?: number) {
  if (code === "configuration" || code === "credential") return "A busca de lugares está indisponível agora. Você pode editar a busca ou continuar pelo cadastro manual.";
  if (code === "quota") return retryAfterSeconds
    ? `A busca de lugares pediu uma pausa. Tente novamente em cerca de ${retryAfterSeconds} segundos ou continue pelo cadastro manual.`
    : "A busca de lugares pediu uma pausa. Tente novamente em alguns instantes ou continue pelo cadastro manual.";
  if (code === "timeout") return "A busca de lugares demorou demais. Você pode tentar novamente ou continuar pelo cadastro manual.";
  return "Não conseguimos buscar outros lugares agora. Você pode editar a busca, tentar novamente ou continuar pelo cadastro manual.";
}

export function retryAfterSeconds(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 300);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  const milliseconds = timestamp - Date.now();
  return milliseconds > 0 ? Math.min(Math.ceil(milliseconds / 1_000), 300) : undefined;
}
