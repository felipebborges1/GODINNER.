import { NextResponse } from "next/server";
import { normalizeProfileLink, validateProfileBio } from "@/lib/profile-fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditPayload = {
  bio?: unknown;
  website?: unknown;
  expectedAvatarPath?: unknown;
  avatar?: { action?: unknown; path?: unknown };
};

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Entre para editar seu perfil." }, { status: 401 });

  let input: EditPayload;
  try { input = await request.json() as EditPayload; }
  catch { return NextResponse.json({ error: "Dados de perfil inválidos." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Dados de perfil inválidos." }, { status: 400 });
  const bio = validateProfileBio(input.bio);
  const website = normalizeProfileLink(input.website);
  if (bio.error || website.error) return NextResponse.json({ error: bio.error ?? website.error }, { status: 400 });
  const action = input.avatar?.action;
  if (!["keep", "remove", "replace"].includes(String(action))) return NextResponse.json({ error: "Alteração de foto inválida." }, { status: 400 });
  const nextPath = input.avatar?.path;
  const validPath = typeof nextPath === "string" && new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(?:jpg|png|webp)$`, "i").test(nextPath);
  if (action === "replace" && !validPath) return NextResponse.json({ error: "Foto inválida. Selecione-a novamente." }, { status: 400 });

  const { data: current, error: readError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (readError || !current) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  const previousPath = current.avatar_url ?? null;
  if ((input.expectedAvatarPath ?? null) !== previousPath) return NextResponse.json({ error: "Seu perfil mudou em outra sessão. Recarregue antes de salvar." }, { status: 409 });

  const avatarPath = action === "replace" ? nextPath as string : action === "remove" ? null : previousPath;
  const currentWebsite = current.website_url ?? null;
  const update: { bio?: string; website_url?: string | null; avatar_url?: string | null } = {};
  if (bio.value !== current.bio) update.bio = bio.value;
  if (website.value !== currentWebsite) update.website_url = website.value;
  if (avatarPath !== previousPath) update.avatar_url = avatarPath;
  if (!Object.keys(update).length) return NextResponse.json({ bio: current.bio, website: currentWebsite, avatarPath: previousPath });

  let mutation = supabase.from("profiles").update(update).eq("id", user.id);
  mutation = previousPath === null ? mutation.is("avatar_url", null) : mutation.eq("avatar_url", previousPath);
  const { data: saved, error: writeError } = await mutation.select("*").single();
  if (writeError || !saved) {
    const missingColumn = writeError?.code === "42703" || writeError?.code === "PGRST204";
    return NextResponse.json({ error: missingColumn ? "O campo de link ainda não está disponível no banco. Nenhuma alteração foi salva." : "Não foi possível salvar o perfil. Tente novamente." }, { status: missingColumn ? 503 : 409 });
  }

  // Remove the old file only after the new profile row has been confirmed.
  if (previousPath?.startsWith(`${user.id}/`) && previousPath !== saved.avatar_url) {
    await supabase.storage.from("avatars").remove([previousPath]);
  }
  return NextResponse.json({ bio: saved.bio, website: saved.website_url ?? null, avatarPath: saved.avatar_url });
}
