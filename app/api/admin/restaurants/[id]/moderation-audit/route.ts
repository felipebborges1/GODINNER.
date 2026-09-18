import { NextResponse } from "next/server";
import { collectModerationAuthorIds, resolveModerationAuthor } from "@/lib/admin-moderation-authorship";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data: administrator } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (administrator?.role !== "admin") return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  const { id } = await context.params;
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, status, submitted_by, submitted_at")
    .eq("id", id)
    .maybeSingle();
  if (restaurantError) return NextResponse.json({ error: "Não foi possível carregar a auditoria." }, { status: 500 });
  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado." }, { status: 404 });

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("id, user_id, rating, rating_method, comment, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });
  if (reviewsError) return NextResponse.json({ error: "Não foi possível carregar as reviews para moderação." }, { status: 500 });

  const authorIds = collectModerationAuthorIds(restaurant.submitted_by, (reviews ?? []).map((review) => review.user_id));
  const profilesResponse = authorIds.length
    ? await supabase.from("profiles").select("id, name, username").in("id", authorIds)
    : { data: [], error: null };
  const profilesById = new Map((profilesResponse.data ?? []).map((profile) => [profile.id, profile]));
  return NextResponse.json({
    restaurant: {
      submittedAt: restaurant.submitted_at,
      author: resolveModerationAuthor(restaurant.submitted_by, profilesById, Boolean(profilesResponse.error)),
    },
    reviews: (reviews ?? []).map((review) => ({
      id: review.id,
      author: resolveModerationAuthor(review.user_id, profilesById, Boolean(profilesResponse.error)),
      createdAt: review.created_at,
      rating: Number(review.rating),
      ratingMethod: review.rating_method,
      comment: review.comment,
      restaurantStatus: restaurant.status,
    })),
  });
}
