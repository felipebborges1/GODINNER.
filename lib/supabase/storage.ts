import { createSupabaseBrowserClient } from "./browser";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_OUTPUT_DIMENSION = 1600;

export const avatarImageRequirements = {
  minDimension: 320,
  maxBytes: MAX_IMAGE_BYTES,
  maxOutputDimension: AVATAR_MAX_OUTPUT_DIMENSION,
  acceptedTypes: ALLOWED_IMAGE_TYPES,
};

export function getAvatarFileValidationError(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Este formato de foto não é compatível. Escolha uma foto JPG, PNG ou WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "A imagem deve ter no máximo 5 MB.";
  return null;
}

function storageExtension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

export function getAvatarUploadErrorMessage(error: unknown) {
  const details = error && typeof error === "object" ? error as { statusCode?: number | string; message?: string } : {};
  const status = String(details.statusCode ?? "");
  const message = String(details.message ?? "").toLowerCase();
  if (status === "401" || message.includes("jwt") || message.includes("not authenticated")) return "Sua sessão expirou. Entre novamente para enviar sua foto.";
  if (status === "413" || message.includes("file size") || message.includes("too large") || message.includes("exceed")) return "A foto processada ficou maior que 5 MB. Escolha outra imagem.";
  return "Não foi possível enviar sua foto. Tente novamente.";
}

export function createSafeStoragePath(userId: string, file: File, scope: "avatars" | "restaurant-submissions" | "review-photos") {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) throw new Error("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.");
  const extension = storageExtension(file.type);
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadUserImage(userId: string, file: File, scope: "avatars" | "restaurant-submissions" | "review-photos") {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { data: null, error: new Error("Supabase não está configurado.") };
  const path = createSafeStoragePath(userId, file, scope);
  const result = await supabase.storage.from(scope).upload(path, file, { contentType: file.type, upsert: false });
  if (result.error) return { data: null, error: result.error };
  // Buckets are private by design. Return a short-lived signed URL instead of
  // exposing a public URL that would bypass the storage access policies.
  const signed = await supabase.storage.from(scope).createSignedUrl(path, 60 * 60);
  if (signed.error) return { data: null, error: signed.error };
  return { data: { path, url: signed.data.signedUrl }, error: null };
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const validationError = getAvatarFileValidationError(file);
  if (validationError) return { data: null, error: new Error(validationError) };
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { data: null, error: new Error("Supabase não está configurado.") };
  const path = createSafeStoragePath(userId, file, "avatars");
  const uploaded = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) return { data: null, error: uploaded.error };
  return { data: { path }, error: null };
}

export async function removeProfileAvatar(path: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: new Error("Supabase não está configurado.") };
  const result = await supabase.storage.from("avatars").remove([path]);
  return { error: result.error };
}

export async function removeReviewPhotos(paths: string[]) {
  if (!paths.length) return { error: null };
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: new Error("Supabase não está configurado.") };
  const result = await supabase.storage.from("review-photos").remove(paths);
  return { error: result.error };
}

export async function createSignedImageUrl(scope: "avatars" | "restaurant-submissions" | "review-photos", path: string, expiresIn = 60 * 60) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { data: null, error: new Error("Supabase não está configurado.") };
  const signed = await supabase.storage.from(scope).createSignedUrl(path, expiresIn);
  return signed.error || !signed.data?.signedUrl
    ? { data: null, error: signed.error ?? new Error("Não foi possível gerar a URL assinada.") }
    : { data: signed.data.signedUrl, error: null };
}
