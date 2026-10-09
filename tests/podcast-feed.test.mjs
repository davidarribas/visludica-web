import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  FEED_TIMEOUT_MS,
  loadFeed,
  parseFeedXml,
  reviveSnapshot,
} from "../src/lib/podcast-feed.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Vis Ludica</title>
    <description>Juegos de mesa</description>
    <itunes:image href="https://visludica.com/portada.jpg" />
    <item>
      <title>Episodo de prueba: Catan &amp; amigos</title>
      <guid isPermaLink="false">https://feeds.captivate.fm/visludica/123e4567-e89b-12d3-a456-426614174000</guid>
      <pubDate>Mon, 01 Sep 2025 10:00:00 +0000</pubDate>
      <itunes:duration>1:05:30</itunes:duration>
      <itunes:summary>Resumen del episodio</itunes:summary>
      <content:encoded><![CDATA[<p>Notas del <strong>episodio</strong></p><script>alert(1)</script>]]></content:encoded>
      <itunes:image href="https://visludica.com/ep1.jpg" />
      <enclosure url="https://media.captivate.fm/ep1.mp3" length="1" type="audio/mpeg" />
    </item>
    <item>
      <title>Segundo episodio</title>
      <guid>999e4567-e89b-12d3-a456-426614174000</guid>
      <pubDate>Tue, 02 Sep 2025 10:00:00 +0000</pubDate>
      <itunes:duration>3600</itunes:duration>
      <description>Descripción simple</description>
      <enclosure url="https://media.captivate.fm/ep2.mp3" length="1" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

const snapshotFixture = (episodes) => JSON.stringify({
  captured_at: "2025-09-15T10:00:00.000Z",
  feed_url: "https://feeds.captivate.fm/visludica/",
  episodes,
  meta: { title: "Vis Ludica", description: "snapshot", imageUrl: "https://visludica.com/portada.jpg" },
});

function snapshotWithOneEpisode() {
  const feed = parseFeedXml(VALID_XML);
  return snapshotFixture(feed.episodes.slice(0, 1));
}

async function writeSnapshot(tempDir, content = snapshotWithOneEpisode()) {
  const path = join(tempDir, "feed-snapshot.json");
  await writeFile(path, content, "utf8");
  return path;
}

// Registro de identidad con los GUID de la fixture XML (o uno explícito).
async function writeRegistry(tempDir, mapping) {
  const path = join(tempDir, "slug-registry.json");
  await writeFile(path, JSON.stringify({ version: 1, slugs: mapping }, null, 2), "utf8");
  return path;
}

function registryFromXml(xml = VALID_XML) {
  return Object.fromEntries(parseFeedXml(xml).episodes.map((ep) => [ep.guid, ep.slug]));
}

function remoteFetch(xml = VALID_XML) {
  return async () => new Response(xml, { status: 200 });
}

function failingFetch(error = new TypeError("fetch failed")) {
  return async () => {
    throw error;
  };
}

function httpFetch(status) {
  return async () => new Response("no", { status });
}

// fetch simulado que solo se rinde cuando el AbortSignal dispara el timeout,
// para probar de verdad que loadFeed aplica un límite temporal.
function hangingFetch() {
  return async (url, { signal } = {}) => {
    assert.ok(signal instanceof AbortSignal, "el fetch debe recibir un AbortSignal");
    return new Promise((_, reject) => {
      if (signal.aborted) return reject(signal.reason ?? new Error("aborted"));
      signal.addEventListener("abort", () => reject(new Error("The operation was aborted due to timeout")));
    });
  };
}

function quietLog() {
  const warnings = [];
  return { warnings, warn: (...args) => warnings.push(args.join(" ")), error: () => {}, log: () => {} };
}

test("parseFeedXml extrae episodios con slug, guid→captivateId y duración", () => {
  const { episodes, meta } = parseFeedXml(VALID_XML);
  assert.equal(episodes.length, 2);
  assert.equal(meta.title, "Vis Ludica");
  const [first, second] = episodes;
  assert.equal(first.slug, "episodo-de-prueba-catan-amigos");
  assert.equal(first.captivateId, "123e4567-e89b-12d3-a456-426614174000");
  assert.equal(first.duration, "1h 5m");
  assert.equal(first.audioUrl, "https://media.captivate.fm/ep1.mp3");
  assert.match(first.content, /<p>Notas del <strong>episodio<\/strong><\/p>/);
  assert.equal(second.duration, "1h 0m");
  assert.ok(first.pubDate instanceof Date && !Number.isNaN(first.pubDate.getTime()));
});

test("parseFeedXml rechaza XML inválido y feeds sin estructura mínima", () => {
  assert.throws(() => parseFeedXml("<rss><channel>roto"));
  assert.throws(() => parseFeedXml("no es xml"));
  assert.throws(() => parseFeedXml("<rss><channel><title>solo título</title></channel></rss>"), /no es válido/);
  assert.throws(() => parseFeedXml("<rss><channel><item><title>sin guid</title></item></channel></rss>"), /no es válido/);
});

test("episodios importados usan el ID del audio de Captivate y conservan el GUID histórico", () => {
  const guid = "D822A6E8-7622-4DA6-BFC8-35DCBD2BFDB3";
  const id = "1d0412e0-0b00-41be-808a-a33ba6f654ac";
  for (const audioUrl of [
    `https://podcasts.captivate.fm/media/${id}/visludica037.mp3`,
    `https://episodes.captivate.fm/episode/${id}.mp3`,
  ]) {
    const xml = VALID_XML
      .replace("https://feeds.captivate.fm/visludica/123e4567-e89b-12d3-a456-426614174000", guid)
      .replace("https://media.captivate.fm/ep1.mp3", audioUrl);
    const [episode] = parseFeedXml(xml).episodes;
    assert.equal(episode.guid, guid);
    assert.equal(episode.captivateId, id);

    // Las copias existentes guardaron por error el GUID como ID del player.
    const [cached] = reviveSnapshot(snapshotFixture([{ ...episode, captivateId: guid }])).episodes;
    assert.equal(cached.guid, guid);
    assert.equal(cached.slug, episode.slug);
    assert.equal(cached.captivateId, id);
  }
});

test("snapshot histórico: Dominant Species y todo el archivo tienen el ID del enclosure", async () => {
  const snapshot = reviveSnapshot(await readFile(join(root, "src/data/podcast/feed-snapshot.json"), "utf8"));
  const dominantSpecies = snapshot.episodes.find((episode) => episode.slug === "dominant-species");
  assert.equal(dominantSpecies.captivateId, "1d0412e0-0b00-41be-808a-a33ba6f654ac");
  assert.equal(dominantSpecies.guid, "D822A6E8-7622-4DA6-BFC8-35DCBD2BFDB3");
  for (const episode of snapshot.episodes) {
    assert.equal(episode.captivateId, new URL(episode.audioUrl).pathname.split("/")[2].replace(/\.mp3$/, ""), episode.slug);
  }
});

test("slugs estables: acentos normalizados y duplicados con sufijo -2", () => {
  const xml = VALID_XML
    .replace("Segundo episodio", "Reseña: El Grande & Épico")
    .replace("999e4567-e89b-12d3-a456-426614174000", "888e4567-e89b-12d3-a456-426614174000");
  const withDup = xml.replace(
    "</channel>",
    `<item><title>Reseña El Grande Épico</title><guid>777e4567-e89b-12d3-a456-426614174000</guid><pubDate>Wed, 03 Sep 2025 10:00:00 +0000</pubDate></item></channel>`,
  );
  const { episodes } = parseFeedXml(withDup);
  assert.deepEqual(
    episodes.map((ep) => ep.slug),
    ["episodo-de-prueba-catan-amigos", "resena-el-grande-epico", "resena-el-grande-epico-2"],
  );
});

test("remoto válido → se usa el remoto", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    const feed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath: join(tempDir, "inexistente.json"),
      registryPath: await writeRegistry(tempDir, registryFromXml()),
      fetchImpl: remoteFetch(),
      log: quietLog(),
    });
    assert.equal(feed.source, "remote");
    assert.equal(feed.episodes.length, 2);
    assert.equal(feed.meta.title, "Vis Ludica");
  } finally {
    await rm_r(tempDir);
  }
});

test("error de red + snapshot válido → snapshot con aviso explícito", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    const snapshotPath = await writeSnapshot(tempDir);
    const registryPath = await writeRegistry(tempDir, registryFromXml());
    const log = quietLog();
    const feed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: failingFetch(),
      log,
    });
    assert.equal(feed.source, "snapshot");
    assert.equal(feed.episodes.length, 1);
    assert.equal(log.warnings.length, 1);
    assert.match(log.warnings[0], /\[podcast\]/);
    assert.match(log.warnings[0], /no está disponible/);
    assert.match(log.warnings[0], /snapshot last-known-good/);
    assert.match(log.warnings[0], /NO es el feed actual/);
  } finally {
    await rm_r(tempDir);
  }
});

test("timeout del fetch → camino de snapshot", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    const snapshotPath = await writeSnapshot(tempDir);
    const registryPath = await writeRegistry(tempDir, registryFromXml());
    const feed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      timeoutMs: 20,
      fetchImpl: hangingFetch(),
      log: quietLog(),
    });
    assert.equal(feed.source, "snapshot");
  } finally {
    await rm_r(tempDir);
  }
});

test("respuesta HTTP no válida → camino de snapshot", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    const snapshotPath = await writeSnapshot(tempDir);
    const registryPath = await writeRegistry(tempDir, registryFromXml());
    const feed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: httpFetch(503),
      log: quietLog(),
    });
    assert.equal(feed.source, "snapshot");
  } finally {
    await rm_r(tempDir);
  }
});

test("XML inválido y feed sin episodios → camino de snapshot", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    const snapshotPath = await writeSnapshot(tempDir);
    const registryPath = await writeRegistry(tempDir, registryFromXml());
    const brokenXml = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch("<rss><channel><item><title>solo"),
      log: quietLog(),
    });
    assert.equal(brokenXml.source, "snapshot");

    const emptyFeed = await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch("<rss><channel><title>vacío</title></channel></rss>"),
      log: quietLog(),
    });
    assert.equal(emptyFeed.source, "snapshot");
  } finally {
    await rm_r(tempDir);
  }
});

test("remoto falla y no hay snapshot → fallo claro, nunca un podcast vacío", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    await assert.rejects(
      loadFeed({
        feedUrl: "https://example.invalid/rss",
        snapshotPath: join(tempDir, "inexistente.json"),
        registryPath: join(tempDir, "inexistente-registry.json"),
        fetchImpl: failingFetch(),
        log: quietLog(),
      }),
      /feed remoto falló.*y no hay un snapshot válido/s,
    );
  } finally {
    await rm_r(tempDir);
  }
});

test("remoto falla y snapshot inválido → fallo claro", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    for (const content of ["no es json", JSON.stringify({ episodes: [], meta: {} })]) {
      const snapshotPath = await writeSnapshot(tempDir, content);
      await assert.rejects(
        loadFeed({
          feedUrl: "https://example.invalid/rss",
          snapshotPath,
          registryPath: join(tempDir, "inexistente-registry.json"),
          fetchImpl: failingFetch(),
          log: quietLog(),
        }),
        /no hay un snapshot válido/,
      );
    }
  } finally {
    await rm_r(tempDir);
  }
});

test("loadFeed nunca modifica el snapshot", async () => {
  const tempDir = await mkdtemp(join(root, ".tmp-podcast-feed-"));
  try {
    const snapshotPath = await writeSnapshot(tempDir);
    const registryPath = await writeRegistry(tempDir, registryFromXml());
    const before = await readFile(snapshotPath, "utf8");
    await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: remoteFetch(),
      log: quietLog(),
    });
    await loadFeed({
      feedUrl: "https://example.invalid/rss",
      snapshotPath,
      registryPath,
      fetchImpl: failingFetch(),
      log: quietLog(),
    });
    assert.equal(await readFile(snapshotPath, "utf8"), before);
  } finally {
    await rm_r(tempDir);
  }
});

test("el timeout por defecto es un límite explícito y acotado", () => {
  assert.equal(typeof FEED_TIMEOUT_MS, "number");
  assert.ok(FEED_TIMEOUT_MS > 0 && FEED_TIMEOUT_MS <= 30_000);
});

// Sustituto de rm con recursividad.
async function rm_r(path) {
  await rm(path, { recursive: true, force: true });
}
