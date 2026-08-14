import { AlertCircle } from "lucide-react";

export function ErrorState({
  title = "Não conseguimos carregar isso agora.",
  message = "Tente novamente em alguns instantes.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-10 text-center">
      <AlertCircle className="mx-auto mb-3 text-red-500" aria-hidden="true" />
      <h2 className="font-bold text-red-900">{title}</h2>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-5 min-h-11 rounded-full bg-red-600 px-5 text-sm font-bold text-white">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
