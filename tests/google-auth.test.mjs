import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Google OAuth uses the existing callback and preserves only safe next paths", async () => {
  const authForm = await readFile(new URL("../components/auth/auth-form.tsx", import.meta.url), "utf8");
  const callback = await readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(authForm, /signInWithOAuth\(\{/);
  assert.match(authForm, /provider: "google"/);
  assert.match(authForm, /redirectTo: `\$\{window\.location\.origin\}\/auth\/callback\?provider=google&next=/);
  assert.match(authForm, /Continuar com Google/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /safeNext\(url\.searchParams\.get\("next"\)\)/);
  assert.match(callback, /username_needs_confirmation/);
  assert.match(callback, /oauth_cancelled_or_denied/);
});

test("new social users receive a provisional username and must claim a public one server-side", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260901000000_google_auth_username_onboarding.sql", import.meta.url), "utf8");
  const onboarding = await readFile(new URL("../components/onboarding/onboarding-flow.tsx", import.meta.url), "utf8");
  assert.match(migration, /username_needs_confirmation boolean not null default false/);
  assert.match(migration, /'pending\.'/);
  assert.match(migration, /claim_profile_username/);
  assert.match(migration, /auth\.uid\(\) is null/);
  assert.match(migration, /revoke all on function public\.claim_profile_username\(text\) from public/);
  assert.match(migration, /grant execute on function public\.claim_profile_username\(text\) to authenticated/);
  assert.match(onboarding, /rpc\("claim_profile_username"/);
  assert.match(onboarding, /usernamePattern/);
});
