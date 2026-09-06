import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { validateCollections } from "../scripts/validate-content-relations.mjs";
import {
  formatDuration,
  formatPartialDate,
  formatPlayers,
  formatPriceSnapshot,
  formatProductContext,
  newsEventLabels,
  resolveNewsGraph,
} from "../src/lib/news-model.mjs";
import { createTechnicalFixtureCollections } from "./fixtures/news-graph-v1.mjs";
import {
  createV2TechnicalFixtureCollections,
  fixtureLookup,
} from "./fixtures/news-graph-v2.mjs";

function lookupFixture(collections) {
  return ({ collection, id }) => {
    const found = collections.get(collection)?.get(id);
    return found && { ...found, id };
  };
}

test("a persisted V1 News resolves to the common one-product view", async () => {
  const collections = createTechnicalFixtureCollections();
  const news = {
    ...collections.get("news").get("fixture-announcement"),
    id: "fixture-announcement",
    body: "V1 body",
  };
  const resolved = await resolveNewsGraph(news, lookupFixture(collections));

  assert.equal(resolved.slug, "fixture-announcement-slug");
  assert.equal(resolved.productCount, 1);
  assert.equal(resolved.products[0].version.id, "fixture-version");
  assert.equal(resolved.products[0].game.id, "fixture-base");
  assert.equal(resolved.products[0].heading, "Fixture Base");
  assert.equal(resolved.image, "/images/versions/fixture-cover.svg");
  assert.equal(resolved.bodyMarkdown, "V1 body");
  assert.ok(!("sources" in resolved));
});

test("a new one-product News resolves typed facts, organizations, and its historical price", async () => {
  const collections = createV2TechnicalFixtureCollections();
  const news = collections.get("news").get("king-of-tokyo-godzilla-release");
  const resolved = await resolveNewsGraph(news, fixtureLookup(collections));
  const [product] = resolved.products;

  assert.equal(resolved.productCount, 1);
  assert.equal(resolved.image, "/images/versions/king-of-tokyo-godzilla-es.webp");
  assert.equal(product.game.id, "king-of-tokyo-godzilla");
  assert.equal(product.version.id, "king-of-tokyo-godzilla-es");
  assert.deepEqual(product.facts.players, { min: 2, max: 6 });
  assert.deepEqual(product.facts.durationMinutes, { min: 30, max: 30 });
  assert.equal(product.facts.recommendedAgeMin, 8);
  assert.equal(product.facts.credits[0].role, "designer");
  assert.equal(product.facts.spanishPublisher, "Devir");
  assert.equal(product.facts.priceSnapshot.amount_minor, 4999);
  assert.equal(product.facts.priceSnapshot.observed_at, "2026-08-24T10:00:00+02:00");
});

test("multiproduct resolution preserves editorial order without inventing a principal product", async () => {
  const collections = createV2TechnicalFixtureCollections();
  const news = collections.get("news").get("star-wars-legion-wave-2026-08-28");
  const resolved = await resolveNewsGraph(news, fixtureLookup(collections));

  assert.equal(resolved.productCount, 5);
  assert.deepEqual(
    resolved.products.map(({ version }) => version.id),
    news.data.products.map(({ version }) => version.id),
  );
  assert.deepEqual(
    resolved.products.map(({ facts }) => facts.priceSnapshot.amount_minor),
    [3999, 4199, 4999, 2999, 2499],
  );
  assert.deepEqual(resolved.contextGameTitles, ["Star Wars: Legión"]);
  assert.equal(formatProductContext(resolved.contextGameTitles, 5), "Star Wars: Legión · 5 productos");
  assert.equal(resolved.image, "/images/news/star-wars-legion-wave-2026-08-28.webp");
  assert.ok(!("primaryProduct" in resolved));
  assert.ok(!("primary" in resolved.products[0]));
});

test("a multiproduct News never falls back to the first Version cover", async () => {
  const collections = createV2TechnicalFixtureCollections();
  const news = structuredClone(
    collections.get("news").get("star-wars-legion-wave-2026-08-28"),
  );
  delete news.data.image;

  const resolved = await resolveNewsGraph(news, fixtureLookup(collections));
  assert.equal(resolved.products[0].version.data.cover.startsWith("/images/versions/"), true);
  assert.equal(resolved.image, undefined);
});

test("Heroes of Tamriel keeps one group deposit and does not inherit parent facts", async () => {
  const collections = createV2TechnicalFixtureCollections();
  const news = collections.get("news").get("tes-heroes-tamriel-reservation-process");
  const resolved = await resolveNewsGraph(news, fixtureLookup(collections));

  assert.equal(resolved.productCount, 6);
  assert.equal(resolved.groupPriceSnapshot.amount_minor, 2000);
  assert.equal(resolved.products[0].facts.players.min, 1);
  assert.equal(resolved.products[1].facts.players, undefined);
  assert.equal(resolved.products.every(({ facts }) => facts.priceSnapshot === undefined), true);
  assert.deepEqual(resolved.contextGameTitles, ["The Elder Scrolls: La traición de la Segunda Era"]);
});

test("content_change remains its own public event and uses the single Version cover", async () => {
  const collections = createV2TechnicalFixtureCollections();
  const news = collections.get("news").get("tes-spanish-first-edition-errata-corrections");
  const resolved = await resolveNewsGraph(news, fixtureLookup(collections));

  assert.equal(resolved.eventType, "content_change");
  assert.equal(newsEventLabels[resolved.eventType], "Cambio de contenido");
  assert.equal(resolved.productCount, 1);
  assert.equal(resolved.image, "/images/versions/tes-betrayal-second-era-es-first.webp");
});

test("public formatting derives exact, ranged, open, age-related and commercial text from numbers", () => {
  assert.equal(formatPlayers({ min: 2, max: 2 }), "2 jugadores");
  assert.equal(formatPlayers({ min: 2, max: 4 }), "2–4 jugadores");
  assert.equal(formatPlayers({ min: 2 }), "2+ jugadores");
  assert.equal(formatDuration({ min: 30, max: 30 }), "30 min");
  assert.equal(formatDuration({ min: 45, max: 60 }), "45–60 min");
  assert.equal(formatPartialDate({ value: "2026-08-24", precision: "day" }), "24 de agosto de 2026");
  assert.match(
    formatPriceSnapshot({ amount_minor: 9499, currency: "EUR" }),
    /^94,99\s€$/,
  );
});

test("the relational validator rejects V2 duplicates, broken relations, facts, and snapshots", () => {
  const mutations = [
    (copy) => {
      const news = copy.get("news").get("star-wars-legion-wave-2026-08-28").data;
      news.products[1].version.id = news.products[0].version.id;
    },
    (copy) => {
      copy.get("news").get("king-of-tokyo-godzilla-release").data.products[0].version.id =
        "missing-version";
    },
    (copy) => {
      copy.get("games").get("king-of-tokyo-godzilla").data.duration_minutes.max = 10;
    },
    (copy) => {
      copy.get("news").get("king-of-tokyo-godzilla-release").data.products[0].price_snapshot.currency =
        "euros";
    },
    (copy) => {
      copy.get("news").get("king-of-tokyo-godzilla-release").data.products = [];
    },
  ];

  for (const mutate of mutations) {
    const copy = structuredClone(createV2TechnicalFixtureCollections());
    mutate(copy);
    assert.notEqual(validateCollections(copy).length, 0);
  }
});

test("the built list preserves the eleven V1 slugs and permits later News", async () => {
  const newsDirectory = new URL("../dist/noticias/", import.meta.url);
  const entries = await readdir(newsDirectory, { withFileTypes: true });
  const detailDirectories = entries.filter((entry) => entry.isDirectory());
  const [indexHtml, detailHtml] = await Promise.all([
    readFile(new URL("index.html", newsDirectory), "utf8"),
    readFile(new URL("anuncio-tokens-acrilicos-beast/index.html", newsDirectory), "utf8"),
  ]);

  const expectedV1Slugs = [
    "anuncio-tokens-acrilicos-beast",
    "anuncio-monedas-metalicas-beast",
    "anuncio-miniaturas-beast",
    "anuncio-beast-shattered-isles",
    "anuncio-beast-the-great-hunt",
    "reposicion-leviathan-wilds",
    "preventa-quartermaster-general-1914",
    "anuncio-revenge-of-the-seven-dwarfs",
    "anuncio-primera-edicion-espanola-terrorscape",
    "reposicion-thunder-road-vendetta-extra-ammo",
    "preventa-zombie-princess",
  ];
  const builtSlugs = new Set(detailDirectories.map((entry) => entry.name));
  for (const slug of expectedV1Slugs) assert.ok(builtSlugs.has(slug), `missing V1 slug ${slug}`);
  assert.match(indexHtml, /href="\/noticias\/anuncio-tokens-acrilicos-beast"/);
  assert.match(indexHtml, />Anuncio</);
  assert.match(detailHtml, />Tokens acrílicos de BEAST</);
  assert.match(detailHtml, />Accesorio</);
  assert.doesNotMatch(detailHtml, />Fuentes</);
  assert.doesNotMatch(detailHtml, /editorial_input/);
});
