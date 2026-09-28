import assert from "node:assert/strict";
const [base, slug] = process.argv.slice(2);
assert.ok(base && slug, "Usage: node scripts/verify-restaurant-seo.mjs <base> <published-slug>");
for (const userAgent of ["Mozilla/5.0", "Googlebot", "Twitterbot"]) {
  const response = await fetch(`${base}/restaurant/${slug}`, { headers: { "User-Agent": userAgent } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`https://www.godinner.com.br/restaurant/${slug}`), "official canonical");
  assert.match(html, /<h1\b[^>]*>[^<]+<\/h1>/, "visible server heading");
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('"@type":"Restaurant"') || html.includes('"@type":"BarOrPub"'));
  assert.ok(!html.includes("submitted_by"), "no private authorship fields");
  const missing = await fetch(`${base}/restaurant/seo-audit-nonexistent-20260928`, { headers: { "User-Agent": userAgent } });
  assert.equal(missing.status, 404, `${userAgent}: real 404 before streaming`);
  assert.match(await missing.text(), /noindex/);
  console.log(`PASS restaurant HTML, canonical, schema, 404: ${userAgent}`);
}
