import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  buildSearchText,
  matchesSearch,
  normalizeSearch,
} from "../src/lib/archive-search.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("la búsqueda no distingue acentos ni mayúsculas", () => {
  assert.equal(normalizeSearch("  Vis LÚDICA  "), "vis ludica");
  assert.equal(matchesSearch("expansion cordoba", "EXPANSIÓN Córdoba"), true);
});

test("la búsqueda exige todos los términos sin imponer su orden", () => {
  const searchText = buildSearchText("Brass: Birmingham", "Reseña del juego económico");

  assert.equal(matchesSearch(searchText, "economico brass"), true);
  assert.equal(matchesSearch(searchText, "birmingham reseña"), true);
  assert.equal(matchesSearch(searchText, "brass cooperativo"), false);
  assert.equal(matchesSearch(searchText, "   "), false);
});

test("los índices publicados permanecen separados por sección", async () => {
  const [podcastRaw, newsRaw] = await Promise.all([
    readFile(join(root, "dist/podcast/indice.json"), "utf8"),
    readFile(join(root, "dist/noticias/indice.json"), "utf8"),
  ]);
  const podcast = JSON.parse(podcastRaw);
  const news = JSON.parse(newsRaw);

  assert.ok(podcast.length > 24, "el índice de podcast debe incluir más que la primera página");
  assert.ok(news.length > 0, "el índice de noticias no debe estar vacío");
  assert.ok(podcast.every((item) => item.href.startsWith("/podcast/")));
  assert.ok(news.every((item) => item.href.startsWith("/noticias/")));
  assert.ok(podcast.every((item) => !item.href.startsWith("/noticias/")));
  assert.ok(news.every((item) => !item.href.startsWith("/podcast/")));
});

test("las dos portadas conservan contenido estático y configuran su propio índice", async () => {
  const [podcast, news] = await Promise.all([
    readFile(join(root, "dist/podcast/index.html"), "utf8"),
    readFile(join(root, "dist/noticias/index.html"), "utf8"),
  ]);

  assert.match(podcast, /data-index-url="\/podcast\/indice\.json"/);
  assert.doesNotMatch(podcast, /data-index-url="\/noticias\/indice\.json"/);
  assert.match(podcast, /data-archive-search-static/);
  assert.match(podcast, /class="episode-card/);

  assert.match(news, /data-index-url="\/noticias\/indice\.json"/);
  assert.doesNotMatch(news, /data-index-url="\/podcast\/indice\.json"/);
  assert.match(news, /data-archive-search-static/);
  assert.match(news, /class="news-card/);
});
