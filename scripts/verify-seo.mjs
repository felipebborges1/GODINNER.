import assert from "node:assert/strict";

const base = process.argv[2] || "http://localhost:3120";
const official = "https://www.godinner.com.br";
for (const path of ["/", "/sobre", "/privacy", "/terms"]) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes(`rel="canonical" href="${official}${path === "/" ? "/" : path}"`) || html.includes(`rel="canonical" href="${official}${path === "/" ? "" : path}"`), `canonical ${path}`);
  assert.ok(!response.headers.get("x-robots-tag")?.includes("noindex"), `public page indexable ${path}`);
  if (path === "/") {
    assert.ok(html.includes('"@type":"WebSite"'));
    assert.ok(html.includes('id="about-godinner"'), "visible brand content in server HTML");
  }
  console.log(`PASS public ${path}`);
}
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
assert.equal((xml.match(/<loc>/g) || []).length, 4);
assert.ok(xml.includes(`${official}/sobre`));
assert.ok(!xml.includes("vercel.app"));
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.ok(robots.includes(`Sitemap: ${official}/sitemap.xml`));
assert.ok(!/^Disallow: \/$/m.test(robots));
for (const path of ["/login", "/notifications", "/review/new", "/search"]) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  assert.ok(response.headers.get("x-robots-tag")?.includes("noindex"), `noindex ${path}`);
}
const image = await fetch(`${base}/opengraph-image`);
assert.equal(image.status, 200);
assert.ok(image.headers.get("content-type")?.includes("image/png"));
console.log("PASS sitemap, robots, private routes and sharing image");
