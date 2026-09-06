import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  formatDuration, formatPlayers, formatPrice, formatProductContext,
} from "../src/lib/news-model.mjs";
import { validateNewsEntries } from "../scripts/validate-news-content.mjs";

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
