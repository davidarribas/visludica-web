import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const rendererPath = new URL("../src/pages/noticias/[slug].astro", import.meta.url);
const schemaPath = new URL("../src/content.config.ts", import.meta.url);
const editorialNewsPath = new URL(
  "../dist/noticias/anuncio-tokens-acrilicos-beast/index.html",
  import.meta.url,
);
const fixturePath = new URL("./fixtures/news-graph-v1.mjs", import.meta.url);

test("the public news renderer does not derive markup from News.sources", async () => {
  const renderer = await readFile(rendererPath, "utf8");

  assert.doesNotMatch(renderer, /news\.data\.sources/);
  assert.doesNotMatch(renderer, /source\.url/);
  assert.doesNotMatch(renderer, /news-sources/);
  assert.doesNotMatch(renderer, /Información editorial suministrada/);
});

test("an editorial_input source does not produce a public sources section", async () => {
  const html = await readFile(editorialNewsPath, "utf8");

  assert.doesNotMatch(html, />Fuentes</);
  assert.doesNotMatch(html, /Información editorial suministrada/);
});

test("News.sources remains part of the schema and can retain source URLs", async () => {
  const [schema, fixture] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readFile(fixturePath, "utf8"),
  ]);

  assert.match(schema, /const sources = z\.array/);
  assert.match(schema, /\n    sources,\n/);
  assert.match(fixture, /https:\/\/example\.com\/fixture-announcement/);
});
