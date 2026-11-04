import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { XMLParser } from "fast-xml-parser";

const dist = new URL("../dist/", import.meta.url);
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

test("el build publica /noticias/rss.xml con las noticias más recientes primero", async () => {
  const feed = parser.parse(await readFile(new URL("noticias/rss.xml", dist), "utf8"));
  const items = [feed.rss.channel.item].flat();
  const total = (await readdir(new URL("../src/content/news/", import.meta.url))).filter((f) => f.endsWith(".md")).length;

  assert.equal(feed.rss.channel.title, "Vis Ludica — Noticias");
  assert.equal(items.length, Math.min(50, total));
  const dates = items.map((item) => Date.parse(item.pubDate));
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
  for (const item of items) {
    assert.match(item.link, /^https:\/\/visludica\.com\/noticias\/[a-z0-9-]+\/$/);
    assert.equal(item.guid["#text"] ?? item.guid, item.link);
    assert.ok(item.description);
    if (item.enclosure) {
      assert.match(item.enclosure.url, /^https:\/\/visludica\.com\/images\/news\//);
      assert.ok(Number(item.enclosure.length) > 0);
      assert.match(item.enclosure.type, /^image\//);
    }
  }
});

test("todas las páginas anuncian el feed de noticias", async () => {
  const home = await readFile(new URL("index.html", dist), "utf8");
  assert.match(home, /<link rel="alternate" type="application\/rss\+xml" title="Vis Ludica — Noticias" href="\/noticias\/rss.xml">/);
});
