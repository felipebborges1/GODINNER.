import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { attributionEligibility, firstPublicName, isActiveVisit, validInviteCode, validVisitToken } from "../lib/personal-invite-rules.ts";
import { isShareCancellation } from "../lib/invite-sharing.ts";

const require = createRequire(import.meta.url);
const inviter = "00000000-0000-4000-8000-000000000001";
const invitee = "00000000-0000-4000-8000-000000000002";
const visit = { token: "00000000-0000-4000-8000-000000000003", inviter_id: inviter, opened_at: "2026-01-01T00:00:00.000Z", expires_at: "2026-01-31T00:00:00.000Z" };
const account = { id: invitee, created_at: "2026-01-02T00:00:00.000Z", confirmed_at: "2026-01-03T00:00:00.000Z" };

function compile(path, dependencies) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)(id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id), mod, mod.exports);
  return mod.exports;
}

test("public code is opaque and first name contains no private fields", () => {
  assert.equal(validInviteCode("a".repeat(32)), true);
  assert.equal(validInviteCode("00000000-0000-4000-8000-000000000001"), false);
  assert.equal(validInviteCode("felipe@example.com"), false);
  assert.equal(firstPublicName("  Felipe Borges  "), "Felipe");
  assert.equal(validVisitToken(visit.token), true);
});

test("cancelling native sharing is not treated as a failure", () => {
  assert.equal(isShareCancellation(new DOMException("Cancelled", "AbortError")), true);
  assert.equal(isShareCancellation({ name: "AbortError" }), true);
  assert.equal(isShareCancellation(new Error("Network failed")), false);
});

test("only genuinely new, confirmed accounts within the original 30-day window qualify", () => {
  const now = Date.parse("2026-01-04T00:00:00Z");
  assert.equal(attributionEligibility(account, visit, now), "eligible");
  assert.equal(attributionEligibility({ ...account, confirmed_at: null }, visit, now), "unconfirmed");
  assert.equal(attributionEligibility({ ...account, created_at: "2025-12-31T23:59:59Z" }, visit, now), "existing_or_expired");
  assert.equal(attributionEligibility({ ...account, created_at: visit.opened_at }, visit, now), "existing_or_expired");
  assert.equal(attributionEligibility({ ...account, id: inviter }, visit, now), "self");
  assert.equal(attributionEligibility(account, visit, Date.parse(visit.expires_at)), "expired");
  assert.equal(isActiveVisit(visit, Date.parse(visit.expires_at) - 1), true);
  assert.equal(isActiveVisit(visit, Date.parse(visit.expires_at)), false);
});

test("a second invite in the window does not replace or renew the first; expiration permits a new visit", async () => {
  const records = new Map([[visit.token, { ...visit, expires_at: new Date(Date.now() + 86_400_000).toISOString() }]]);
  const saved = [];
  const cookie = { value: visit.token };
  const codes = new Map([["a".repeat(32), inviter], ["b".repeat(32), invitee]]);
  const db = { from: table => {
    assert.equal(table, "personal_invite_visits");
    return { insert: value => ({ select: () => ({ single: async () => {
      const row = { token: crypto.randomUUID(), inviter_id: value.inviter_id, opened_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() };
      records.set(row.token, row); saved.push(row); return { data: row, error: null };
    } }) }) };
  } };
  const route = compile("../app/api/invites/visit/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, cookies: { set: (name, value) => { cookie.value = value; } } }) } },
    "@/lib/supabase/server": { createSupabaseServiceRoleClient: () => db },
    "@/lib/personal-invites": { INVITE_COOKIE: "godinner_personal_invite", validInviteCode, inviteByCode: async code => codes.has(code) ? { inviterId: codes.get(code) } : null, currentVisit: async token => { const row = records.get(token); return row && isActiveVisit(row) ? row : null; } },
  });
  const request = code => ({ headers: new Headers({ origin: "https://www.godinner.com.br" }), nextUrl: new URL("https://www.godinner.com.br/api/invites/visit"), cookies: { get: () => ({ value: cookie.value }) }, json: async () => ({ code }) });
  assert.equal((await route.POST(request("b".repeat(32)))).status, 200);
  assert.equal(cookie.value, visit.token);
  assert.equal(saved.length, 0);
  records.get(visit.token).expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await route.POST(request("b".repeat(32)))).status, 200);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].inviter_id, invitee);
  assert.equal((await route.POST(request("c".repeat(32)))).status, 404);
  assert.equal(saved.length, 1);
});

test("migration enforces one attribution per invitee and visit, self-referral, confirmation and private access", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260929000000_personal_invites.sql", import.meta.url), "utf8");
  for (const clause of ["inviter_id uuid primary key", "on conflict (inviter_id) do nothing", "after insert on public.profiles", "after insert on auth.users", "personal_invite_signups", "invitee_id uuid primary key", "visit_token uuid not null unique", "invitee_id <> inviter_id", "account.confirmed_at is null", "account.created_at <= visit.opened_at", "now() >= visit.expires_at", "enable row level security", "revoke all"]) assert.ok(sql.includes(clause), clause);
});

test("pending email signup survives confirmation in another browser; repeated callback cannot duplicate", async () => {
  const records = new Map([[visit.token, { ...visit, opened_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), expires_at: new Date(Date.now() + 27 * 86_400_000).toISOString() }]]);
  const attributions = new Map();
  const db = { from: table => {
    if (table === "personal_invite_signups") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { visit_token: visit.token }, error: null }) }) }) };
    if (table === "personal_invite_visits") return { select: () => ({ eq: (_key, token) => ({ maybeSingle: async () => ({ data: records.get(token) ?? null, error: null }) }) }) };
    if (table === "personal_invite_attributions") return { insert: async value => {
      if (attributions.has(value.invitee_id)) return { error: { code: "23505" } };
      attributions.set(value.invitee_id, value); return { error: null };
    } };
    throw new Error(`Unexpected table ${table}`);
  } };
  const rules = await import("../lib/personal-invite-rules.ts");
  const invitations = compile("../lib/personal-invites.ts", {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/supabase/server": { createSupabaseServiceRoleClient: () => db },
    "@/lib/personal-invite-rules": rules,
  });
  const newAccount = { id: invitee, created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), confirmed_at: null };
  assert.equal(await invitations.attributeConfirmedUser(newAccount), "unconfirmed");
  assert.equal(attributions.size, 0);
  const confirmed = { ...newAccount, confirmed_at: new Date().toISOString() };
  assert.equal(await invitations.attributeConfirmedUser(confirmed), "attributed");
  assert.equal(await invitations.attributeConfirmedUser(confirmed), "already_attributed");
  assert.equal(attributions.size, 1);
  assert.equal(attributions.get(invitee).inviter_id, inviter);
  assert.equal(await invitations.attributeConfirmedUser({ ...confirmed, id: inviter }), "self");
  assert.equal(await invitations.attributeConfirmedUser({ ...confirmed, id: "other", created_at: new Date(Date.now() - 40 * 86_400_000).toISOString() }), "existing_or_expired");
});

test("Google callback can use the same-browser cookie without user metadata", async () => {
  const freshVisit = { ...visit, opened_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 30 * 86_400_000 - 1000).toISOString() };
  const db = { from: table => table === "personal_invite_signups"
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
    : table === "personal_invite_visits"
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: freshVisit, error: null }) }) }) }
      : { insert: async () => ({ error: null }) } };
  const invitations = compile("../lib/personal-invites.ts", {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => ({ value: visit.token }) }) },
    "@/lib/supabase/server": { createSupabaseServiceRoleClient: () => db },
    "@/lib/personal-invite-rules": await import("../lib/personal-invite-rules.ts"),
  });
  const googleAccount = { id: invitee, created_at: new Date().toISOString(), confirmed_at: new Date().toISOString(), user_metadata: {} };
  assert.equal(await invitations.attributeConfirmedUser(googleAccount), "attributed");
  assert.equal(await invitations.attributeConfirmedUser({ ...googleAccount, created_at: new Date(Date.now() - 86_400_000).toISOString() }), "existing_or_expired");
});
