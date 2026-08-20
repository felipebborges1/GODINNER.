import { NextResponse } from "next/server";
import { getWebPushConfig } from "@/lib/push/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubscriptionPayload = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
function parseSubscription(value: unknown) {
  const candidate = value as SubscriptionPayload | null;
  if (!candidate || typeof candidate.endpoint !== "string" || typeof candidate.keys?.p256dh !== "string" || typeof candidate.keys?.auth !== "string") return null;
  try { if (new URL(candidate.endpoint).protocol !== "https:") return null; } catch { return null; }
  return { endpoint: candidate.endpoint, p256dh: candidate.keys.p256dh, auth: candidate.keys.auth };
}
async function authenticatedClient() { const supabase = await createSupabaseServerClient(); if (!supabase) return { supabase: null, user: null }; const { data } = await supabase.auth.getUser(); return { supabase, user: data.user }; }

export async function POST(request: Request) {
  if (!getWebPushConfig().enabled) return new NextResponse(null, { status: 204 });
  const { supabase, user } = await authenticatedClient();
  if (!supabase || !user) return new NextResponse(null, { status: 401 });
  const subscription = parseSubscription(await request.json().catch(() => null));
  if (!subscription) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").upsert({ user_id: user.id, ...subscription }, { onConflict: "endpoint" });
  return error ? NextResponse.json({ ok: false }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await authenticatedClient();
  if (!supabase || !user) return new NextResponse(null, { status: 401 });
  const subscription = parseSubscription(await request.json().catch(() => null));
  if (!subscription) return new NextResponse(null, { status: 400 });
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", subscription.endpoint);
  return new NextResponse(null, { status: 204 });
}
