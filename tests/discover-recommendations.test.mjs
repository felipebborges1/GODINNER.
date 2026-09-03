import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [discover, section, analytics, engine] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/discover/recommendation-section.tsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8"),
  readFile(new URL("../lib/recommendations/engine.ts", import.meta.url), "utf8"),
]);

test("Discover reuses the R1 engine once and hides personalized recommendations for visitors", () => {
  assert.match(discover, /import \{ generateRecommendations \} from "@\/lib\/recommendations\/engine"/);
  assert.match(discover, /generateRecommendations\(\{/);
  assert.match(discover, /limit: 6/);
  assert.match(discover, /currentUserId && recommendations && <RecommendationSection result=\{recommendations\}/);
  assert.doesNotMatch(discover, /RECOMMENDATION_RANKING_CONFIG/);
});

test("recommendation UI uses the shared maturity state for locked progress, ready cards, and empty results", () => {
  assert.match(section, /maturity === "locked"/);
  assert.match(section, /\{reviewCount\} de 3 experiências/);
  assert.match(section, /Avalie 3 lugares para começarmos a entender seus gostos\./);
  assert.match(section, /Falta só 1 experiência para desbloquear suas recomendações\./);
  assert.match(section, /Estamos preparando novas recomendações para você\./);
  assert.match(section, /role="progressbar"/);
  assert.match(section, /Escolhidos com base no seu gosto e na sua rede\./);
});

test("recommendation cards reuse RestaurantCard, preserve profile navigation, reason and native mobile scroll", () => {
  assert.match(section, /<RestaurantCard restaurant=\{recommendation\.restaurant\}/);
  assert.match(section, /data-recommendation-reason/);
  assert.match(section, /touch-auto snap-x snap-mandatory/);
  assert.doesNotMatch(section, /touch-pan-x/);
  assert.match(section, /overflow-x-auto overscroll-x-contain/);
  assert.match(section, /onRestaurantClick=\{\(\) => trackEvent\("recommendation_clicked"/);
});

test("analytics records the requested recommendation lifecycle without personal data", () => {
  for (const event of ["recommendation_section_viewed", "recommendation_impression", "recommendation_clicked", "recommendation_unlock_progress_viewed"]) {
    assert.match(analytics, new RegExp(`"${event}"`));
    assert.match(section, new RegExp(`"${event}"`));
  }
  assert.match(section, /restaurant_id: recommendation\.restaurant\.id/);
  assert.match(section, /reason_type: recommendation\.reasonType/);
  assert.doesNotMatch(section, /email|latitude:|longitude:/i);
});

test("Discover uses a stable recommendation skeleton and preserves the R1 reason output", () => {
  assert.match(discover, /aria-label="Carregando recomendações"/);
  assert.doesNotMatch(discover, /Suas recomendações começam com suas experiências/);
  assert.match(section, /\{recommendation\.reason\}/);
  assert.match(engine, /reasonType/);
});
