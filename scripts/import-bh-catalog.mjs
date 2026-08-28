import { readFile } from "node:fs/promises";

const ZONA_SUL_RESTAURANTS = new Set([
  "Coco Bambu Anchieta", "Madero Steak House Anchieta Garden Shopping",
  "Akane Cozinha Japonesa", "Gennaro Belvedere", "Ninetto Trattoria", "Udon Belvedere",
  "Caê Restaurante Bar", "Olegário Jardins", "Restaurante e Bar do Laninho", "Santíssimus Gourmet",
  "Pizzaria Mangabeiras Cidade Jardim", "Formoso Cozinha Natural", "Kanpai Sion | Comida Japonesa | Rodízio de Sushi BH", "Parrilla del Mercado",
  "Casa Piacere", "Fratelli D'Italia (Pelusinho)", "Parrilla Savassi 158", "Restaurante Drummond",
  "Pizzaria Mangabeiras Gutierrez", "Gennaro Lourdes", "L'Entrecôte de Paris - Belo Horizonte", "Nino Cucina - Belo Horizonte", "Nonna Carmela", "Restaurante Benvindo",
  "Eu Te Amo Burger", "Pé de Marmelo Gastronomia", "Pizzaria Mangabeiras Matriz", "Tudo no Espeto - Mangabeiras",
  "Cantina Piacenza: Massas, Risotos, Peixes, Carnes, Vinhos, Delivery, BH", "Mathilde Restaurante", "The Meat Club",
  "Amarelim Beaga", "Porcão BH", "Casa da Lasanha", "Dona Lucinha Restaurante", "Passarela do Sabor Bh", "Uluru Café Pátio Savassi | Restaurante | Cafeteria & Brunch na Savassi",
  "Attelier Savassi Restaurante", "Casa dos Contos", "Dona Derna", "Gennaro", "Restaurante do Ano", "Yakan",
  "Azougue Fogo & Bar", "Gastrô Hub - Restaurante e Espaço de Eventos", "Restaurante Ramalhete",
  "Bar e Restaurante do Moitta", "Cantina Amici", "La Traviata Osteria - Sion", "Restaurante & Pizzaria SION",
]);

const SANTA_TEREZA_RESTAURANTS = new Set([
  "Badalo", "Beco D'Itália", "Esquina Santê", "Feitiço de Santa Tereza: Bar e Cozinha", "Iracema", "QUINTAL DO DURVAL",
]);

function loadEnv(source) {
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function normalize(value = "") {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function barCuisine(candidate) {
  const name = normalize(candidate.name);
  if (name.includes("espet") || name.includes("churrasquinho")) return ["Espetinho"];
  if (name.includes("boteco") || name.includes("buteco") || name.includes("botequim") || name.includes("butiquim") || name.includes("butequeria")) return ["Boteco"];
  return candidate.cuisines;
}

async function fetchCatalog(url, serviceRoleKey) {
  const response = await fetch(`${url}/rest/v1/restaurants?select=slug,name,google_place_id`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status} ao consultar catálogo.`);
  return response.json();
}

function selectCandidates(discovery) {
  return discovery.candidates
    .filter((candidate) => candidate.classification === "NEW")
    .filter((candidate) => candidate.category === "bar" || ZONA_SUL_RESTAURANTS.has(candidate.name) || SANTA_TEREZA_RESTAURANTS.has(candidate.name))
    .map((candidate) => ({
      slug: candidate.proposedSlug,
      name: candidate.name,
      address: candidate.address,
      city: candidate.city,
      neighborhood: candidate.neighborhood,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      category: candidate.category,
      cuisines: candidate.category === "bar" ? barCuisine(candidate) : candidate.cuisines,
      price_range: candidate.priceRange,
      phone: candidate.phone,
      website: candidate.website,
      google_place_id: candidate.googlePlaceId,
      status: "published",
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

const [discoveryPath] = process.argv.slice(2).filter((argument) => argument !== "--apply");
const apply = process.argv.includes("--apply");
if (!discoveryPath) throw new Error("Informe o caminho do JSON gerado por discover-bh-catalog.mjs.");

await loadEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Variáveis locais obrigatórias não configuradas.");

const discovery = JSON.parse(await readFile(discoveryPath, "utf8"));
const candidates = selectCandidates(discovery);
if (candidates.length !== 130) throw new Error(`Esperados 130 candidatos aprovados; encontrados ${candidates.length}.`);

const duplicateCandidatePlaceIds = Object.values(Object.groupBy(candidates, (candidate) => candidate.google_place_id)).filter((group) => group.length > 1);
const duplicateCandidateSlugs = Object.values(Object.groupBy(candidates, (candidate) => candidate.slug)).filter((group) => group.length > 1);
if (duplicateCandidatePlaceIds.length || duplicateCandidateSlugs.length) throw new Error("A seleção contém Place IDs ou slugs duplicados.");

const existing = await fetchCatalog(supabaseUrl, serviceRoleKey);
const byExistingPlaceId = new Map(existing.flatMap((restaurant) => restaurant.google_place_id ? [[restaurant.google_place_id, restaurant]] : []));
const byExistingSlug = new Map(existing.map((restaurant) => [restaurant.slug, restaurant]));
const conflicts = candidates.filter((candidate) => {
  const samePlace = byExistingPlaceId.get(candidate.google_place_id);
  const sameSlug = byExistingSlug.get(candidate.slug);
  return Boolean((samePlace && samePlace.slug !== candidate.slug) || (sameSlug && sameSlug.google_place_id !== candidate.google_place_id));
});
if (conflicts.length) throw new Error(`O catálogo mudou desde a discovery: ${conflicts.length} conflitos de Place ID ou slug.`);
const alreadyImported = candidates.filter((candidate) => byExistingPlaceId.has(candidate.google_place_id) || byExistingSlug.has(candidate.slug));

const summary = {
  selected: candidates.length,
  restaurants: candidates.filter((candidate) => candidate.category === "restaurant").length,
  santaTereza: candidates.filter((candidate) => candidate.neighborhood === "Santa Tereza").length,
  bars: candidates.filter((candidate) => candidate.category === "bar").length,
  alreadyImported: alreadyImported.length,
  wouldInsert: candidates.length - alreadyImported.length,
  byNeighborhood: Object.fromEntries(Object.entries(Object.groupBy(candidates, (candidate) => candidate.neighborhood)).map(([neighborhood, rows]) => [neighborhood, rows.length])),
  apply,
};

if (!apply) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const response = await fetch(`${supabaseUrl}/rest/v1/restaurants?on_conflict=slug`, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(candidates),
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Supabase HTTP ${response.status} ao importar catálogo.`);
const imported = await response.json();
if (imported.length !== candidates.length) throw new Error(`Importação incompleta: ${imported.length}/${candidates.length}.`);
console.log(JSON.stringify({ ...summary, imported: imported.length }, null, 2));
