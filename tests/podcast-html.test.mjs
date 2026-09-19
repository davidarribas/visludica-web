import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { formatEpisodeHtml, sanitizeRssHtml } from "../src/lib/rss-html.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("elimina los scripts por completo, incluido su contenido", () => {
  const out = sanitizeRssHtml('<p>antes</p><script>alert(1)</script><p>después</p>');
  assert.doesNotMatch(out, /<script/i);
  assert.doesNotMatch(out, /alert/i);
  assert.match(out, /<p>antes<\/p>/);
  assert.match(out, /<p>después<\/p>/);
});

test("elimina atributos on* de las etiquetas", () => {
  const out = sanitizeRssHtml('<img src="x" onerror="alert(1)"><p onclick="alert(2)">hola</p>');
  assert.doesNotMatch(out, /onerror/i);
  assert.doesNotMatch(out, /onclick/i);
  assert.match(out, /<img src="x" \/>/);
  assert.match(out, /hola/);
});

test("rechaza URLs javascript: y data: en enlaces e imágenes", () => {
  const out = sanitizeRssHtml(
    '<a href="javascript:alert(1)">texto</a><a href="DATA:text/plain,algo">otro</a>',
  );
  assert.doesNotMatch(out, /javascript:/i);
  assert.doesNotMatch(out, /data:/i);
  assert.match(out, /<a>texto<\/a>/);
  assert.match(out, /otro/);
});

test("descarta iframes, objetos y estilos, con o sin contenido ejecutable", () => {
  const out = sanitizeRssHtml(
    '<iframe src="https://evil.example"></iframe><object data="x"></object>' +
    '<style>body{background:url(javascript:alert(1))}</style><p>visible</p>',
  );
  assert.doesNotMatch(out, /<iframe/i);
  assert.doesNotMatch(out, /<object/i);
  assert.doesNotMatch(out, /<style/i);
  assert.doesNotMatch(out, /evil\.example/);
  assert.match(out, /visible/);
});

test("elimina atributos style y class", () => {
  const out = sanitizeRssHtml('<p style="position:fixed" class="x">texto</p>');
  assert.doesNotMatch(out, /style=/i);
  assert.doesNotMatch(out, /class=/i);
  assert.match(out, /<p>texto<\/p>/);
});

test("rechaza URLs de protocolo relativo", () => {
  const out = sanitizeRssHtml('<a href="//evil.example/x">enlace</a>');
  assert.doesNotMatch(out, /evil\.example/);
});

test("conserva el HTML editorial de las shownotes", () => {
  const out = sanitizeRssHtml(
    "<h2>Sección</h2><p>Texto con <strong>negrita</strong>, <em>cursiva</em> y <br>salto.</p>" +
    "<ul><li>uno</li><li>dos</li></ul><blockquote>cita</blockquote>" +
    '<a href="https://visludica.com/notas">notas</a>' +
    '<img src="https://visludica.com/portada.jpg" alt="Portada" width="300" height="200">',
  );
  assert.match(out, /<h2>Sección<\/h2>/);
  assert.match(out, /<strong>negrita<\/strong>/);
  assert.match(out, /<em>cursiva<\/em>/);
  assert.match(out, /<br \/>/);
  assert.match(out, /<ul><li>uno<\/li><li>dos<\/li><\/ul>/);
  assert.match(out, /<blockquote>cita<\/blockquote>/);
  assert.match(out, /<img src="https:\/\/visludica\.com\/portada\.jpg" alt="Portada" width="300" height="200" \/>/);
});

test("los enlaces externos http(s) reciben target y rel de seguridad", () => {
  const out = sanitizeRssHtml(
    '<a href="https://ejemplo.com/a">https</a><a href="http://ejemplo.com/b">http</a><a href="/relativo">interno</a>',
  );
  assert.match(out, /<a href="https:\/\/ejemplo\.com\/a" target="_blank" rel="noopener noreferrer">https<\/a>/);
  assert.match(out, /<a href="http:\/\/ejemplo\.com\/b" target="_blank" rel="noopener noreferrer">http<\/a>/);
  assert.match(out, /<a href="\/relativo">interno<\/a>/);
});

test("formatEpisodeHtml compacta los saltos sobre HTML ya sanitizado", () => {
  const collapsed = formatEpisodeHtml(sanitizeRssHtml("<p>a</p><br><br><br><br><p>b</p>"));
  assert.equal(collapsed, "<p>a</p></p><p><p>b</p>");
  const single = formatEpisodeHtml(sanitizeRssHtml("<p>a</p><br><br><p>b</p>"));
  assert.equal(single, "<p>a</p><br><p>b</p>");
});

test("ningún episodio del snapshot deja residuos peligrosos tras sanitizar", async () => {
  const { reviveSnapshot } = await import("../src/lib/podcast-feed.mjs");
  const snapshot = reviveSnapshot(await readFile(join(root, "src/data/podcast/feed-snapshot.json"), "utf8"));
  assert.ok(snapshot.episodes.length > 0, "el snapshot debe contener episodios");

  for (const episode of snapshot.episodes) {
    const out = formatEpisodeHtml(sanitizeRssHtml(episode.content)).toLowerCase();
    assert.doesNotMatch(out, /<script/, `residuo <script> en ${episode.slug}`);
    assert.doesNotMatch(out, /\son[a-z]+=/, `atributo on* en ${episode.slug}`);
    assert.doesNotMatch(out, /javascript:/, `javascript: en ${episode.slug}`);
    assert.doesNotMatch(out, /<iframe/, `iframe en ${episode.slug}`);
  }
});
