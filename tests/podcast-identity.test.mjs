import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  assignNewSlug,
  loadFeed,
  loadRegistry,
  parseFeedXml,
  refreshFeed,
  resolveEpisodes,
  reviveSnapshot,
  validateRegistry,
} from "../src/lib/podcast-feed.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

// ——— fixtures ————————————————————————————————————————————————

function item({ title, guid, pubDate = "Mon, 01 Sep 2025 10:00:00 +0000" }) {
  return `    <item>
      <title>${title}</title>
      <guid>${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="https://media.captivate.fm/${guid}.mp3" length="1" type="audio/mpeg" />
    </item>`;
}

function feedXml(items, channelTitle = "Vis Ludica") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${channelTitle}</title>
    <description>Juegos de mesa</description>
${items.join("\n")}
  </channel>
</rss>`;
}

function writeTemp(dir, name, data) {
  return writeFile(join(dir, name), typeof data === "string" ? data : JSON.stringify(data, null, 2), "utf8").then(() => join(dir, name));
}

function snapshotOf(episodes) {
  return {
    captured_at: "2025-09-15T10:00:00.000Z",
    feed_url: "https://feeds.captivate.fm/visludica/",
    episodes,
    meta: { title: "Vis Ludica", description: "", imageUrl: "" },
  };
}

function registryOf(mapping) {
  return { version: 1, slugs: mapping };
}

function remoteFetch(xml) {
  return async () => new Response(xml, { status: 200 });
}

function quietLog() {
  const warnings = [];
  const logs = [];
  return {
    warnings,
    logs,
    warn: (...args) => warnings.push(args.join(" ")),
    log: (...args) => logs.push(args.join(" ")),
    error: () => {},
  };
}

// ——— A. Regresión completa contra el estado publicado ———

test("regresión: los 283 GUID del snapshot conservan su slug exacto y no hay desconocidos", async () => {
  const snapshotPath = join(root, "src/data/podcast/feed-snapshot.json");
  const registryPath = join(root, "src/data/podcast/slug-registry.json");
  const snapshot = reviveSnapshot(await readFile(snapshotPath, "utf8"));
  const registry = await loadRegistry(registryPath);

  // El bootstrap reprodujo exactamente el routing vigente: mismo número de
  // entradas y mismo mapa GUID→slug que el snapshot (última fuente de URLs).
  assert.equal(Object.keys(registry.slugs).length, snapshot.episodes.length);
  for (const episode of snapshot.episodes) {
    assert.equal(registry.slugs[episode.guid], episode.slug, `slug alterado para ${episode.slug}`);
  }

  const { episodes, unknown } = resolveEpisodes(snapshot.episodes, registry);
  assert.equal(unknown.length, 0);
  assert.equal(episodes.length, snapshot.episodes.length);
  for (const episode of episodes) {
    const original = snapshot.episodes.find((item) => item.guid === episode.guid);
    assert.equal(episode.slug, original.slug);
  }
});

// ——— B. Cambio de título ———

test("cambiar el título de un GUID conocido no cambia el slug", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-id-"));
  try {
    const registryPath = await writeTemp(tempDir, "slug-registry.json", registryOf({ "guid-123": "la-gran-partida" }));
    const renamed = feedXml([item({ title: "La gran partida definitiva", guid: "guid-123" })]);
    const { episodes } = parseFeedXml(renamed);
    const resolved = resolveEpisodes(episodes, await loadRegistry(registryPath));
    assert.equal(resolved.episodes[0].slug, "la-gran-partida");
    assert.equal(resolved.unknown.length, 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

// ——— C. Cambio de orden con títulos duplicados ———

test("invertir el orden de títulos duplicados no intercambia los slugs por GUID", async () => {
  const registry = registryOf({
    "guid-a": "podcast-de-relleno",
    "guid-b": "podcast-de-relleno-2",
  });
  const orderAB = parseFeedXml(feedXml([
    item({ title: "Podcast de relleno", guid: "guid-a" }),
    item({ title: "Podcast de relleno", guid: "guid-b" }),
  ])).episodes;
  const orderBA = [...orderAB].reverse();

  const resolvedAB = resolveEpisodes(orderAB, registry).episodes;
  const resolvedBA = resolveEpisodes(orderBA, registry).episodes;

  const slugAB = new Map(resolvedAB.map((ep) => [ep.guid, ep.slug]));
  const slugBA = new Map(resolvedBA.map((ep) => [ep.guid, ep.slug]));
  assert.deepEqual(slugAB.get("guid-a"), "podcast-de-relleno");
  assert.deepEqual(slugAB.get("guid-b"), "podcast-de-relleno-2");
  assert.deepEqual(slugBA, slugAB);
});

// ——— D. Nuevo duplicado → siguiente sufijo disponible ———

test("un GUID nuevo con título ya usado obtiene el sufijo siguiente sin alterar los anteriores", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-id-"));
  try {
    const existing = {
      "guid-1": "podcast-de-relleno",
      "guid-2": "podcast-de-relleno-2",
      "guid-3": "podcast-de-relleno-3",
      "guid-4": "podcast-de-relleno-4",
      "guid-5": "podcast-de-relleno-5",
    };
    const registryPath = await writeTemp(tempDir, "slug-registry.json", registryOf(existing));
    const snapshotPath = await writeTemp(tempDir, "feed-snapshot.json", snapshotOf([]));
    const feed = feedXml([
      ...Object.entries(existing).map(([guid]) => item({ title: "Podcast de relleno", guid })),
      item({ title: "Podcast de relleno", guid: "guid-nuevo" }),
    ]);

    const result = await refreshFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch(feed),
      log: quietLog(),
    });

    assert.deepEqual(result.assigned, [{ guid: "guid-nuevo", title: "Podcast de relleno", slug: "podcast-de-relleno-6" }]);
    const updated = await loadRegistry(registryPath);
    for (const [guid, slug] of Object.entries(existing)) {
      assert.equal(updated.slugs[guid], slug, `el slug de ${guid} no debe cambiar`);
    }
    assert.equal(updated.slugs["guid-nuevo"], "podcast-de-relleno-6");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("assignNewSlug respeta los slugs históricos aunque no estén en el feed", () => {
  const reserved = new Set(["especial", "especial-2", "especial-3"]);
  assert.equal(assignNewSlug("Especial", reserved), "especial-4");
  assert.equal(assignNewSlug("Otro título", reserved), "otro-titulo");
  assert.equal(assignNewSlug("¿??? ¡¡!!", reserved), "episodio");
});

// ——— E. Slug histórico reservado ———

test("un episodio desaparecido del feed conserva su slug reservado", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-id-"));
  try {
    const registryPath = await writeTemp(tempDir, "slug-registry.json", registryOf({
      "guid-viejo": "episodio-retirado",
      "guid-activo": "episodio-activo",
    }));
    const snapshotPath = await writeTemp(tempDir, "feed-snapshot.json", snapshotOf([]));
    // guid-viejo ha desaparecido del feed; aparece uno nuevo cuyo título
    // slugsificaría exactamente igual.
    const feed = feedXml([
      item({ title: "Episodio retirado", guid: "guid-activo" }),
      item({ title: "Episodio retirado", guid: "guid-recien" }),
    ]);

    await refreshFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch(feed),
      log: quietLog(),
    });

    const updated = await loadRegistry(registryPath);
    assert.equal(updated.slugs["guid-viejo"], "episodio-retirado", "el slug retirado permanece reservado");
    assert.equal(updated.slugs["guid-recien"], "episodio-retirado-2");
    assert.equal(updated.slugs["guid-activo"], "episodio-activo");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

// ——— F. GUID duplicado en el feed ———

test("un feed con el mismo GUID en dos episodios es inválido", () => {
  const duplicated = feedXml([
    item({ title: "Uno", guid: "guid-repetido" }),
    item({ title: "Dos", guid: "guid-repetido" }),
  ]);
  assert.throws(() => parseFeedXml(duplicated), /GUID duplicado/);
});

// ——— G. Colisiones del registro ———

test("un registro con dos GUID que comparten slug se rechaza", () => {
  assert.throws(
    () => validateRegistry(registryOf({ "guid-a": "mismo-slug", "guid-b": "mismo-slug" })),
    /mismo slug|comparten el slug/,
  );
  assert.throws(() => validateRegistry({ version: 2, slugs: {} }), /versión desconocida|versión/);
});

// ——— H. Build con GUID remoto no registrado ———

test("un GUID nuevo en el remoto no se publica: se usa lo conocido y se avisa, sin escribir ficheros", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-id-"));
  try {
    const known = parseFeedXml(feedXml([item({ title: "Episodio conocido", guid: "guid-conocido" })])).episodes[0];
    const snapshotPath = await writeTemp(tempDir, "feed-snapshot.json", snapshotOf([known]));
    const registryPath = await writeTemp(tempDir, "slug-registry.json", registryOf({ "guid-conocido": known.slug }));

    const snapshotBefore = await readFile(snapshotPath, "utf8");
    const registryBefore = await readFile(registryPath, "utf8");

    const log = quietLog();
    const feed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch(feedXml([
        item({ title: "Episodio conocido", guid: "guid-conocido" }),
        item({ title: "Especial Essen 2026", guid: "guid-sin-registro" }),
      ])),
      log,
    });

    assert.equal(feed.source, "remote");
    assert.equal(feed.episodes.length, 1);
    assert.equal(feed.episodes[0].slug, known.slug);
    assert.equal(feed.episodes.some((ep) => ep.guid === "guid-sin-registro"), false, "no se publica el GUID sin registrar");
    assert.equal(log.warnings.filter((w) => w.includes("podcast:refresh")).length, 1, "aviso claro pendiente de refresh");

    assert.equal(await readFile(snapshotPath, "utf8"), snapshotBefore, "el snapshot no se modifica en build");
    assert.equal(await readFile(registryPath, "utf8"), registryBefore, "el registro no se modifica en build");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("sin registro válido el build falla: no hay identidad garantizada", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-id-"));
  try {
    const known = parseFeedXml(feedXml([item({ title: "Episodio conocido", guid: "guid-conocido" })])).episodes[0];
    const snapshotPath = await writeTemp(tempDir, "feed-snapshot.json", snapshotOf([known]));
    await assert.rejects(
      loadFeed({
        feedUrl: "https://example.invalid/rss",
        snapshotPath,
        registryPath: join(tempDir, "inexistente.json"),
        fetchImpl: remoteFetch(feedXml([item({ title: "Episodio conocido", guid: "guid-conocido" })])),
        log: quietLog(),
      }),
      /registro de slugs/,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

// ——— I. podcast:refresh incorpora el GUID nuevo ———

test("refresh asigna el slug definitivo al GUID nuevo y el build posterior lo publica", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-id-"));
  try {
    const known = parseFeedXml(feedXml([item({ title: "Episodio conocido", guid: "guid-conocido" })])).episodes[0];
    const snapshotPath = await writeTemp(tempDir, "feed-snapshot.json", snapshotOf([known]));
    const registryPath = await writeTemp(tempDir, "slug-registry.json", registryOf({ "guid-conocido": known.slug }));
    const newEpisodeFeed = feedXml([
      item({ title: "Especial Essen 2026", guid: "guid-sin-registro" }),
      item({ title: "Episodio conocido", guid: "guid-conocido" }),
    ]);

    const result = await refreshFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch(newEpisodeFeed),
      log: quietLog(),
    });
    assert.deepEqual(result.assigned, [{ guid: "guid-sin-registro", title: "Especial Essen 2026", slug: "especial-essen-2026" }]);

    // Ahora el build (aunque el remoto caiga) publica el episodio nuevo con
    // su slug persistido.
    const feed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: async () => { throw new TypeError("fetch failed"); },
      log: quietLog(),
    });
    assert.equal(feed.episodes.length, 2);
    const published = feed.episodes.find((ep) => ep.guid === "guid-sin-registro");
    assert.equal(published.slug, "especial-essen-2026");
    const knownPublished = feed.episodes.find((ep) => ep.guid === "guid-conocido");
    assert.equal(knownPublished.slug, known.slug);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
