import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { unflatten } from "devalue";
import { createTechnicalFixtureCollections } from "../tests/fixtures/news-graph-v1.mjs";
import { createV2TechnicalFixtureCollections } from "../tests/fixtures/news-graph-v2.mjs";

const STORE_URL = new URL("../node_modules/.astro/data-store.json", import.meta.url);
// Astro omits a declared collection with no entries from its internal store.
const REQUIRED_COLLECTIONS = ["games", "versions", "news"];
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const V1_EVENT_TYPES = new Set([
  "announcement",
  "preorder",
  "release",
  "restock",
  "reprint",
  "new_edition",
  "crowdfunding",
  "delay",
  "cancellation",
  "date_change",
]);
const V2_EVENT_TYPES = new Set([
  "announcement",
  "preorder",
  "release",
  "restock",
  "new_edition",
  "crowdfunding",
  "delay",
  "cancellation",
  "date_change",
  "content_change",
]);
const CREDIT_ROLES = new Set(["designer", "developer", "system_designer"]);
const PRICE_KINDS = new Set(["pvpr", "reservation_deposit"]);

function entryData(collections, collection, id) {
  return collections.get(collection)?.get(id)?.data;
}

function checkReference(collections, reference, expectedCollection, path, errors) {
  if (
    !reference ||
    reference.collection !== expectedCollection ||
    typeof reference.id !== "string"
  ) {
    errors.push(`${path}: referencia inválida; se esperaba ${expectedCollection}`);
    return undefined;
  }

  const target = entryData(collections, expectedCollection, reference.id);
  if (!target) {
    errors.push(`${path}: no existe ${expectedCollection}/${reference.id}`);
  }
  return target;
}

function validateReferenceSet(references, path, errors) {
  const seen = new Set();
  references.forEach((reference, index) => {
    const key = `${reference?.collection}/${reference?.id}`;
    if (seen.has(key)) errors.push(`${path}[${index}]: referencia duplicada ${key}`);
    seen.add(key);
  });
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateGameFacts(data, path, errors) {
  if (data.players !== undefined) {
    if (!data.players || !isPositiveInteger(data.players.min)) {
      errors.push(`${path}.players.min: debe ser un entero positivo`);
    }
    if (data.players?.max !== undefined && !isPositiveInteger(data.players.max)) {
      errors.push(`${path}.players.max: debe ser un entero positivo`);
    }
    if (data.players?.max !== undefined && data.players.max < data.players.min) {
      errors.push(`${path}.players: max debe ser >= min`);
    }
  }

  if (data.duration_minutes !== undefined) {
    if (!data.duration_minutes || !isPositiveInteger(data.duration_minutes.min)) {
      errors.push(`${path}.duration_minutes.min: debe ser un entero positivo`);
    }
    if (!data.duration_minutes || !isPositiveInteger(data.duration_minutes.max)) {
      errors.push(`${path}.duration_minutes.max: debe ser un entero positivo`);
    }
    if (data.duration_minutes?.max < data.duration_minutes?.min) {
      errors.push(`${path}.duration_minutes: max debe ser >= min`);
    }
  }

  if (
    data.recommended_age_min !== undefined &&
    !isPositiveInteger(data.recommended_age_min)
  ) {
    errors.push(`${path}.recommended_age_min: debe ser un entero positivo`);
  }

  if (data.credits !== undefined) {
    if (!Array.isArray(data.credits) || data.credits.length === 0) {
      errors.push(`${path}.credits: debe contener al menos un crédito`);
      return;
    }
    data.credits.forEach((credit, index) => {
      if (!credit || typeof credit.name !== "string" || credit.name.trim().length === 0) {
        errors.push(`${path}.credits[${index}].name: nombre inválido`);
      }
      if (!CREDIT_ROLES.has(credit?.role)) {
        errors.push(`${path}.credits[${index}].role: rol inválido`);
      }
    });
  }
}

function validatePriceSnapshot(snapshot, path, errors) {
  if (!snapshot || typeof snapshot !== "object") {
    errors.push(`${path}: snapshot inválido`);
    return false;
  }
  if (!PRICE_KINDS.has(snapshot.kind)) errors.push(`${path}.kind: tipo de precio inválido`);
  if (!Number.isInteger(snapshot.amount_minor) || snapshot.amount_minor < 0) {
    errors.push(`${path}.amount_minor: debe ser un entero no negativo`);
  }
  if (typeof snapshot.currency !== "string" || !/^[A-Z]{3}$/.test(snapshot.currency)) {
    errors.push(`${path}.currency: debe ser un código ISO 4217`);
  }
  if (typeof snapshot.market !== "string" || !/^[A-Z]{2}$/.test(snapshot.market)) {
    errors.push(`${path}.market: debe ser un código de mercado válido`);
  }
  if (
    typeof snapshot.observed_at !== "string" ||
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(snapshot.observed_at) ||
    Number.isNaN(Date.parse(snapshot.observed_at))
  ) {
    errors.push(`${path}.observed_at: debe ser ISO 8601 con zona horaria`);
  }
  return true;
}

function validateV1News(collections, id, data, errors) {
  checkReference(collections, data.version, "versions", `news/${id}.version`, errors);
  if ("products" in data || "group_price_snapshot" in data) {
    errors.push(`news/${id}: una News V1 no admite products ni group_price_snapshot`);
  }
  if (!V1_EVENT_TYPES.has(data.event_type)) {
    errors.push(`news/${id}.event_type: tipo V1 inválido`);
  }
  if (!Array.isArray(data.sources)) {
    errors.push(`news/${id}.sources: una News V1 requiere sources`);
    return;
  }
  data.sources.forEach((source, index) => {
    if (source.type !== "editorial_input" && typeof source.url !== "string") {
      errors.push(`news/${id}.sources[${index}]: ${source.type} requiere url`);
    }
  });
}

function validateV2News(collections, id, data, errors) {
  if ("version" in data || "sources" in data) {
    errors.push(`news/${id}: una News V2 no admite version ni sources`);
  }
  if (!V2_EVENT_TYPES.has(data.event_type)) {
    errors.push(`news/${id}.event_type: tipo V2 inválido`);
  }
  if (!Array.isArray(data.products) || data.products.length === 0) {
    errors.push(`news/${id}.products: debe contener al menos un producto`);
    return;
  }

  const seenVersions = new Set();
  const productVersions = [];
  data.products.forEach((product, index) => {
    const path = `news/${id}.products[${index}]`;
    const version = checkReference(
      collections,
      product?.version,
      "versions",
      `${path}.version`,
      errors,
    );
    productVersions.push(version);
    if (product?.version?.id) {
      if (seenVersions.has(product.version.id)) {
        errors.push(`${path}.version: Version duplicada ${product.version.id}`);
      }
      seenVersions.add(product.version.id);
    }
    if (product?.price_snapshot !== undefined) {
      validatePriceSnapshot(product.price_snapshot, `${path}.price_snapshot`, errors);
      if (version && !version.markets.includes(product.price_snapshot.market)) {
        errors.push(`${path}.price_snapshot.market: no figura en los markets de la Version`);
      }
    }
  });

  if (data.group_price_snapshot !== undefined) {
    validatePriceSnapshot(data.group_price_snapshot, `news/${id}.group_price_snapshot`, errors);
    if (data.products.length < 2) {
      errors.push(`news/${id}.group_price_snapshot: requiere al menos dos productos`);
    }
    productVersions.forEach((version, index) => {
      if (version && !version.markets.includes(data.group_price_snapshot.market)) {
        errors.push(
          `news/${id}.group_price_snapshot.market: no figura en products[${index}] Version.markets`,
        );
      }
    });
  }
}

export function validateCollections(collections) {
  const errors = [];

  for (const name of REQUIRED_COLLECTIONS) {
    if (!(collections.get(name) instanceof Map)) errors.push(`falta la colección ${name}`);
  }

  for (const [collection, entries] of collections) {
    if (!(entries instanceof Map)) continue;
    for (const id of entries.keys()) {
      if (!ID_PATTERN.test(id) || id.length > 120) {
        errors.push(`${collection}/${id}: ID no es kebab-case seguro de 1..120 caracteres`);
      }
    }
  }

  for (const [id, entry] of collections.get("games") ?? []) {
    const parents = entry.data.relations?.parents ?? [];
    const reimplements = entry.data.relations?.reimplements ?? [];
    validateReferenceSet(parents, `games/${id}.relations.parents`, errors);
    validateReferenceSet(reimplements, `games/${id}.relations.reimplements`, errors);
    parents.forEach((parent, index) =>
      checkReference(collections, parent, "games", `games/${id}.relations.parents[${index}]`, errors),
    );
    reimplements.forEach((game, index) =>
      checkReference(
        collections,
        game,
        "games",
        `games/${id}.relations.reimplements[${index}]`,
        errors,
      ),
    );
    validateGameFacts(entry.data, `games/${id}`, errors);
  }

  for (const [id, entry] of collections.get("versions") ?? []) {
    checkReference(collections, entry.data.game, "games", `versions/${id}.game`, errors);
    const relationKeys = new Set();
    for (const [index, relation] of (entry.data.organizations ?? []).entries()) {
      checkReference(
        collections,
        relation.organization,
        "organizations",
        `versions/${id}.organizations[${index}].organization`,
        errors,
      );
      const key = `${relation.role}/${relation.organization?.id}`;
      if (relationKeys.has(key)) {
        errors.push(`versions/${id}.organizations[${index}]: relación duplicada ${key}`);
      }
      relationKeys.add(key);
    }
  }

  const newsSlugs = new Map();
  for (const [id, entry] of collections.get("news") ?? []) {
    const data = entry.data;
    if (typeof data.slug !== "string" || data.slug.length === 0) {
      errors.push(`news/${id}.slug: falta el slug editorial explícito`);
    } else if (newsSlugs.has(data.slug)) {
      errors.push(`news/${id}.slug: slug duplicado con news/${newsSlugs.get(data.slug)}`);
    } else {
      newsSlugs.set(data.slug, id);
    }

    if (data.content_model_version === 2) {
      validateV2News(collections, id, data, errors);
    } else if (data.content_model_version === undefined) {
      validateV1News(collections, id, data, errors);
    } else {
      errors.push(`news/${id}.content_model_version: versión no soportada`);
    }
  }

  return errors;
}

function verifyEditorialCorpus(collections) {
  const corpusNews = [
    "quartermaster-general-1914-preorder",
    "zombie-princess-preorder",
    "thunder-road-vendetta-extra-ammo-restock",
    "leviathan-wilds-restock",
    "beast-shattered-isles-announcement",
    "beast-the-great-hunt-announcement",
    "beast-miniatures-announcement",
    "beast-metal-coins-announcement",
    "beast-acrylic-tokens-announcement",
    "terrorscape-spanish-first-edition-announcement",
    "revenge-of-the-seven-dwarfs-announcement",
  ];
  const missing = corpusNews.filter((id) => !entryData(collections, "news", id));
  if (missing.length > 0) throw new Error(`Faltan News del corpus editorial: ${missing.join(", ")}`);

  const beastIds = [
    "beast-shattered-isles-announcement",
    "beast-the-great-hunt-announcement",
    "beast-miniatures-announcement",
    "beast-metal-coins-announcement",
    "beast-acrylic-tokens-announcement",
  ];
  const beastVersions = new Set(beastIds.map((id) => entryData(collections, "news", id).version.id));
  if (beastVersions.size !== beastIds.length) {
    throw new Error("La fuente múltiple de BEAST debe conservar News y productos independientes");
  }

  const restock = entryData(collections, "news", "thunder-road-vendetta-extra-ammo-restock");
  const extraAmmo = entryData(collections, "versions", restock.version.id);
  if (restock.event_type !== "restock" || extraAmmo.name !== "Thunder Road: Vendetta — Extra Ammo") {
    throw new Error("La reposición de Extra Ammo debe conservar la misma Version comercial");
  }

  for (const id of ["beast-miniatures", "beast-metal-coins", "beast-acrylic-tokens"]) {
    if (entryData(collections, "games", id)?.type !== "accessory") {
      throw new Error(`${id} debe modelarse como Game accessory`);
    }
  }

  const editorInput = entryData(collections, "news", "quartermaster-general-1914-preorder").sources[0];
  if (editorInput.type !== "editorial_input" || "url" in editorInput) {
    throw new Error("editorial_input debe poder conservarse sin URL inventada");
  }

  console.log("✓ Corpus editorial: 11 News V1 y casos de fuentes múltiples");
  console.log("✓ Reposición → misma Version; expansión y accessory → Game propio");
  console.log("✓ editorial_input sin URL inventada");
}

function assertNoErrors(errors, context) {
  if (errors.length > 0) throw new Error(`${context}:\n- ${errors.join("\n- ")}`);
}

function verifyV1TechnicalFixtureContract(collections) {
  const announcement = entryData(collections, "news", "fixture-announcement");
  const preorder = entryData(collections, "news", "fixture-preorder");
  const version = entryData(collections, "versions", announcement?.version.id);
  const expansion = entryData(collections, "games", "fixture-expansion");
  const reimplementation = entryData(collections, "games", "fixture-reimplementation");
  const versionWithoutBggId = entryData(collections, "versions", "fixture-version-without-bgg-id");
  const withoutImage = entryData(collections, "news", "fixture-without-image");

  if (!announcement || !preorder || !version) {
    throw new Error("No se puede resolver News V1 → Version → Game");
  }
  if (announcement.version.id !== preorder.version.id) {
    throw new Error("Las dos News V1 obligatorias no apuntan a la misma Version");
  }
  if (expansion?.relations.parents[0]?.id !== "fixture-base") {
    throw new Error("No se puede resolver Expansion Game → Parent Game");
  }
  if (reimplementation?.relations.reimplements[0]?.id !== "fixture-base") {
    throw new Error("No se puede resolver la relación de reimplementación");
  }
  if (!versionWithoutBggId || "bgg_version_id" in versionWithoutBggId) {
    throw new Error("El fixture sin bgg_version_id no conserva la ausencia del campo");
  }
  if (!version.cover || !preorder.image || withoutImage.image || versionWithoutBggId.cover) {
    throw new Error("Los fixtures V1 no cubren imagen heredada, propia y ausente");
  }
  console.log("✓ Fixtures V1: relación singular, slugs e imágenes compatibles");
}

function verifyV2TechnicalFixtureContract(collections) {
  const mono = entryData(collections, "news", "king-of-tokyo-godzilla-release");
  const legion = entryData(collections, "news", "star-wars-legion-wave-2026-08-28");
  const tamriel = entryData(collections, "news", "tes-heroes-tamriel-reservation-process");
  const contentChange = entryData(
    collections,
    "news",
    "tes-spanish-first-edition-errata-corrections",
  );
  if (mono.products.length !== 1 || legion.products.length !== 5 || tamriel.products.length !== 6) {
    throw new Error("Cardinalidad inesperada en fixtures V2 mono/multi");
  }
  if (new Set(legion.products.map(({ price_snapshot }) => price_snapshot.amount_minor)).size !== 5) {
    throw new Error("El fixture de Legión debe conservar cinco PVPR distintos");
  }
  if (tamriel.group_price_snapshot.kind !== "reservation_deposit") {
    throw new Error("Heroes of Tamriel debe conservar un depósito conjunto");
  }
  if (contentChange.event_type !== "content_change") {
    throw new Error("El fixture de correcciones debe conservar content_change");
  }
  console.log("✓ Fixtures V2: uniproducto, Legión, Heroes of Tamriel y content_change");
  console.log("✓ Facts parciales, créditos tipados, precios por producto y depósito conjunto");
}

function verifyBrokenReferenceAndContractDetection(v1Collections, v2Collections) {
  const probes = [
    [v1Collections, "Game inexistente desde Version", (copy) => {
      entryData(copy, "versions", "fixture-version").game.id = "missing-game";
    }],
    [v1Collections, "Organization inexistente desde Version", (copy) => {
      entryData(copy, "versions", "fixture-version").organizations[0].organization.id = "missing-org";
    }],
    [v2Collections, "Version V2 inexistente", (copy) => {
      entryData(copy, "news", "king-of-tokyo-godzilla-release").products[0].version.id = "missing-version";
    }],
    [v2Collections, "Version V2 duplicada", (copy) => {
      const news = entryData(copy, "news", "star-wars-legion-wave-2026-08-28");
      news.products[1].version.id = news.products[0].version.id;
    }],
    [v2Collections, "facts inválidos", (copy) => {
      entryData(copy, "games", "king-of-tokyo-godzilla").players.max = 1;
    }],
    [v2Collections, "precio inválido", (copy) => {
      entryData(copy, "news", "king-of-tokyo-godzilla-release").products[0].price_snapshot.amount_minor = -1;
    }],
    [v2Collections, "mercado de precio incompatible", (copy) => {
      entryData(copy, "news", "king-of-tokyo-godzilla-release").products[0].price_snapshot.market = "US";
    }],
    [v2Collections, "products vacío", (copy) => {
      entryData(copy, "news", "king-of-tokyo-godzilla-release").products = [];
    }],
  ];

  for (const [source, label, mutate] of probes) {
    const copy = structuredClone(source);
    mutate(copy);
    if (validateCollections(copy).length === 0) {
      throw new Error(`La prueba controlada no detectó: ${label}`);
    }
    console.log(`✓ Contrato inválido detectado: ${label}`);
  }
}

async function main() {
  const serializedStore = JSON.parse(await readFile(STORE_URL, "utf8"));
  const collections = unflatten(serializedStore);
  const v1Fixtures = createTechnicalFixtureCollections();
  const v2Fixtures = createV2TechnicalFixtureCollections();

  assertNoErrors(validateCollections(collections), "Relaciones de Content Collections no válidas");
  assertNoErrors(validateCollections(v1Fixtures), "Fixtures técnicos V1 no válidos");
  assertNoErrors(validateCollections(v2Fixtures), "Fixtures técnicos V2 no válidos");
  verifyV1TechnicalFixtureContract(v1Fixtures);
  verifyV2TechnicalFixtureContract(v2Fixtures);
  verifyBrokenReferenceAndContractDetection(v1Fixtures, v2Fixtures);
  verifyEditorialCorpus(collections);
  console.log("✓ Contrato público V1/V2 de Content Collections válido");
}

const invokedPath = process.argv[1] && pathToFileURL(process.argv[1]).href;
if (invokedPath === import.meta.url) await main();
