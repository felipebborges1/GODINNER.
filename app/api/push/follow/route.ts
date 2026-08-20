import { NextResponse } from "next/server";
import { sendFollowPush } from "@/lib/push/send-follow-push";
import { getWebPushConfig } from "@/lib/push/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!getWebPushConfig().enabled) return new NextResponse(null, { status: 204 });
  const followingId = (await request.json().catch(() => null) as { followingId?: unknown } | null)?.followingId;
  if (typeof followingId !== "string" || !uuidPattern.test(followingId)) return new NextResponse(null, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new NextResponse(null, { status: 204 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id === followingId) return new NextResponse(null, { status: 204 });
  const { data: follow } = await supabase.from("follows").select("follower_id").eq("follower_id", auth.user.id).eq("following_id", followingId).maybeSingle();
  if (!follow) return new NextResponse(null, { status: 204 });
  const { data: claimed } = await supabase.rpc("claim_follow_push_event", { p_following_id: followingId });
  if (!claimed?.length) return new NextResponse(null, { status: 204 });
  const { data: profile } = await supabase.from("profiles").select("name, username").eq("id", auth.user.id).maybeSingle();
  if (profile?.username) await sendFollowPush({ recipientId: followingId, actorName: profile.name, actorUsername: profile.username });
  return new NextResponse(null, { status: 204 });
}
