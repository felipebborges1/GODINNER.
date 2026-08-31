import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const profile = await readFile(new URL("../components/restaurant/restaurant-profile.tsx", import.meta.url), "utf8");

test("surfaces community spend in the responsive restaurant decision summary", () => {
  assert.match(profile, /aria-label="Resumo de decisão"/);
  assert.match(profile, /grid-cols-2 gap-3 lg:mt-0 lg:grid-cols-3/);
  assert.match(profile, /GODINNER/);
  assert.match(profile, /Seus amigos/);
  assert.match(profile, /Gasto por pessoa/);
  assert.match(profile, /col-span-2 rounded-3xl bg-stone-100 p-5 lg:col-span-1/);
  assert.match(profile, /min-w-0 space-y-10/);
  assert.match(profile, /Média de \$\{formatCommunityExperienceCount/);
  assert.match(profile, /"Ainda sem dados"/);
});

test("keeps editorial pricing secondary and avoids duplicate community spend", () => {
  const summaryStart = profile.indexOf('aria-label="Resumo de decisão"');
  const sidebarStart = profile.indexOf('<aside className="space-y-5">');
  const sidebar = profile.slice(sidebarStart);
  assert.ok(summaryStart >= 0);
  assert.match(sidebar, /Faixa editorial/);
  assert.doesNotMatch(sidebar, /Gasto informado pela comunidade|Gasto médio da comunidade/);
});
