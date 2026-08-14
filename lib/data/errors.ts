export type DataErrorCode = "not_configured" | "unauthorized" | "forbidden" | "not_found" | "validation" | "network" | "unknown";
export type DataError = { code: DataErrorCode; message: string; cause?: unknown };

export function toDataError(error: unknown): DataError {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
  return { code: "unknown", message, cause: error };
}
