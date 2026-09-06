import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  formatDuration, formatPlayers, formatPrice, formatProductContext,
} from "../src/lib/news-model.mjs";
import {
  validateNewsEntries, validateNewsFilenames, validatePublisherRegistry,
} from "../scripts/validate-news-content.mjs";

test("la ficha deriva los datos planos de products", () => {
  const product = {
    name: "Expedición Boreal", type: "expansion", parent: "Atlas Lúdico",
    players_min: 1, players_max: 4, duration_min: 45, duration_max: 60, price_eur: 39.95,
  };
  assert.equal(formatPlayers(product), "1–4 jugadores");
  assert.equal(formatDuration(product), "45–60 min");
  assert.match(formatPrice(product.price_eur), /^39,95\s€$/);
  assert.equal(formatProductContext([product, { ...product, name: "Otra" }]), "Atlas Lúdico · 2 productos");
});

test("la validación rechaza enlaces Markdown externos en el cuerpo", () => {
  const entries = new Map([
    ["noticia-con-enlace", {
      data: { slug: "noticia-con-enlace", products: [] },
      body: "Consulta [la editorial](https://example.com/noticia).",
    }],
  ]);

  assert.deepEqual(validateNewsEntries(entries), [
    "news/noticia-con-enlace: contiene un enlace Markdown externo (http:// o https://)",
  ]);
});

test("la validación exige nombres canónicos de editorial", () => {
  const publishers = [{ name: "Devir", slug: "devir", aliases: ["Devir Iberia"] }];
  const entries = new Map([
    ["noticia", { data: { products: [{ publisher_es: "Devir Iberia" }] }, body: "" }],
  ]);

  assert.deepEqual(validatePublisherRegistry(publishers), []);
  assert.deepEqual(validateNewsEntries(entries, publishers), [
    "news/noticia.products[0].publisher_es: usa el alias Devir Iberia; debe usar Devir",
  ]);
});

test("la validación exige el prefijo de fecha en los ficheros de noticias", () => {
  assert.deepEqual(validateNewsFilenames([
    "2026-09-07-noticia-canonica.md",
    "noticia-sin-fecha.md",
  ]), [
    "news/noticia-sin-fecha.md: debe usar YYYY-MM-DD-<slug-descriptivo>.md",
  ]);
});
