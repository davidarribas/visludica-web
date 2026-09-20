import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const SITEMAP_URL = "https://visludica.com/sitemap-index.xml";

// Extensiones que son ficheros servidos directamente: un href hacia ellas no
// lleva barra final.
const FILE_EXTENSIONS = /\.(astro|css|js|mjs|json|xml|txt|webmanifest|ico|png|jpe?g|webp|gif|svg|woff2?|mp3|pdf)$/i;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

test("ningún enlace interno de página genera una ruta sin barra final", async () => {
  const distDir = join(root, "dist");
  const offenders = [];
  for await (const file of htmlFiles(distDir)) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<a\s[^>]*href="(\/[^"#]*)"/g)) {
      const href = match[1].split("?")[0];
      if (href.startsWith("//")) continue; // protocolo relativo/externo
      if (href.startsWith("/api/")) continue; // servida por el Worker
      if (FILE_EXTENSIONS.test(href)) continue; // fichero, no página
      if (!href.endsWith("/")) offenders.push(`${file}: ${href}`);
    }
  }
  assert.deepEqual(offenders, [], "enlaces internos que provocarían redirect por trailing slash");
});

test("/listen redirige a la URL canónica con barra final, sin cadenas", async () => {
  const redirects = (await readFile(join(root, "public/_redirects"), "utf8")).trim().split("\n");
  const listenRules = redirects.filter((line) => line.startsWith("/listen")).sort();
  assert.deepEqual(listenRules, ["/listen /escuchar/ 301", "/listen/ /escuchar/ 301"]);
  // Ninguna regla de /listen apunta a un destino sin slash (cadena).
  for (const rule of listenRules) assert.match(rule, /\/escuchar\/ 301$/);
});

test("robots.txt existe, referencia el sitemap real y no bloquea producción", async () => {
  const robots = await readFile(join(root, "public/robots.txt"), "utf8");
  assert.match(robots, /^User-agent: \*\nAllow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${SITEMAP_URL}$`, "m"));
  assert.doesNotMatch(robots, /Disallow: \//);
  // El sitemap referenciado es el que genera el build.
  const sitemapFile = SITEMAP_URL.replace("https://visludica.com/", "");
  await readFile(join(root, "dist", sitemapFile), "utf8");
});

test("el staging sirve un robots.txt que prohíbe el rastreo sin tocar el de producción", async () => {
  const staging = await readFile(join(root, "scripts/prepare-staging-dist.mjs"), "utf8");
  assert.match(staging, /Disallow: \//);
  const production = await readFile(join(root, "public/robots.txt"), "utf8");
  assert.doesNotMatch(production, /Disallow/);
});

test("el build genera dist/404.html propia, con navegación y sin canonical", async () => {
  const notFound = await readFile(join(root, "dist/404.html"), "utf8");
  assert.match(notFound, /<title>Página no encontrada \(404\)/);
  assert.match(notFound, /Página no encontrada/);
  for (const href of ["/", "/noticias/", "/podcast/"]) {
    assert.match(notFound, new RegExp(`href="${href}"`), `la 404 debe enlazar ${href}`);
  }
  assert.doesNotMatch(notFound, /rel="canonical"/);
  // La 404 no forma parte del sitemap.
  const sitemaps = ["dist/sitemap-0.xml", "dist/sitemap-index.xml"];
  for (const file of sitemaps) {
    const xml = await readFile(join(root, file), "utf8");
    assert.doesNotMatch(xml, /404/);
  }
});
