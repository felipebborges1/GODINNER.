import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260831000001_convert_matheus_historical_brl_to_eur.sql", import.meta.url), "utf8");

test("uses the approved fixed BRL to EUR rate and monetary precision", () => {
  assert.equal(480 * 0.1662, 79.776);
  assert.equal(Math.round(480 * 0.1662 * 100) / 100, 79.78);
  assert.equal(Math.round(300 * 0.1662 * 100) / 100, 49.86);
  assert.equal(Math.round(200 * 0.1662 * 100) / 100, 33.24);
  assert.match(migration, /Fixed BRL\/EUR rate: 0\.1662/);
});

test("targets only the nine audited Matheus reviews and preserves timestamps", () => {
  assert.match(migration, /ca2ecaff-9692-4678-933e-fa6229f82870/);
  assert.equal((migration.match(/79\.78::numeric/g) ?? []).length, 7);
  assert.match(migration, /49\.86::numeric/);
  assert.match(migration, /33\.24::numeric/);
  assert.match(migration, /disable trigger reviews_set_updated_at/);
  assert.match(migration, /enable trigger reviews_set_updated_at/);
  assert.doesNotMatch(migration, /update public\.restaurants/);
});
