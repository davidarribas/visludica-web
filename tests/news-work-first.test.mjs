import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import {
  formatDuration, formatPlayers, formatPrice, formatProductContext,
} from "../src/lib/news-model.mjs";

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

test("el build conserva los doce slugs históricos", async () => {
  const newsDirectory = new URL("../dist/noticias/", import.meta.url);
  const entries = await readdir(newsDirectory, { withFileTypes: true });
  const slugs = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const expected = [
    "anuncio-tokens-acrilicos-beast", "anuncio-monedas-metalicas-beast", "anuncio-miniaturas-beast",
    "anuncio-beast-shattered-isles", "anuncio-beast-the-great-hunt", "reposicion-leviathan-wilds",
    "preventa-quartermaster-general-1914", "anuncio-revenge-of-the-seven-dwarfs",
    "anuncio-primera-edicion-espanola-terrorscape", "reposicion-thunder-road-vendetta-extra-ammo",
    "preventa-zombie-princess", "cinco-cajas-star-wars-legion-llegan-el-28-de-agosto",
  ];
  for (const slug of expected) assert.ok(slugs.has(slug), `falta ${slug}`);

  const html = await readFile(new URL("anuncio-tokens-acrilicos-beast/index.html", newsDirectory), "utf8");
  assert.match(html, />Tokens acrílicos de BEAST</);
  assert.match(html, />Accesorio</);
  assert.doesNotMatch(html, /Fuentes|Evidence|Intake|N\/D|Desconocido|Por determinar/);
});
