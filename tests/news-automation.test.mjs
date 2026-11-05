import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { load } from "js-yaml";
import sharp from "sharp";
import {
  buildPullRequestBody, madridTimestamp, normalizeSlug, pieceErrors, renderNewsFile,
  replacePublishedAt, telegramErrors,
} from "../scripts/news-lib.mjs";

const run = promisify(execFile);
const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("normalizeSlug deja minúsculas sin acentos ni signos", () => {
  assert.equal(normalizeSlug("Las Ruinas Perdidas de Arnak — Expedición Ñ"), "las-ruinas-perdidas-de-arnak-expedicion-n");
  assert.equal(normalizeSlug("  Watson & Holmes  "), "watson-y-holmes");
  assert.equal(normalizeSlug("sky-team-turbulence"), "sky-team-turbulence");
  assert.throws(() => normalizeSlug("¡¿?!"), /SLUG_INVALIDO/);
});

test("madridTimestamp usa la hora de Madrid con su desplazamiento de invierno y de verano", () => {
  assert.equal(madridTimestamp(new Date("2026-11-05T06:40:00Z")), "2026-11-05T07:40:00+01:00");
  assert.equal(madridTimestamp(new Date("2026-07-01T20:30:00Z")), "2026-07-01T22:30:00+02:00");
  // 23:30 UTC del 5 es ya el día 6 en Madrid
  assert.equal(madridTimestamp(new Date("2026-11-05T23:30:00Z")).slice(0, 10), "2026-11-06");
});

test("el frontmatter generado conserva los datos y el estilo de las noticias", () => {
  const frontmatter = {
    schema: "visludica-news-v1",
    title: 'Título con "comillas"',
    summary: "Resumen: con dos puntos",
    published_at: "2026-11-05T07:40:00+01:00",
    event: "release",
    image: { src: "/images/news/x.webp", alt: "Caja" },
    products: [{ name: "Juego", type: "base_game", designers: ["A", "B"], players_min: 1, players_max: 4, price_eur: 39.95, release_date: "2026-12-01" }],
    tags: ["Uno"],
  };
  const file = renderNewsFile(frontmatter, "\nCuerpo.\n");
  const [, yaml, body] = file.split("---\n");
  assert.match(yaml, /^event: release$/m);
  assert.match(yaml, /^published_at: 2026-11-05T07:40:00\+01:00$/m);
  assert.match(yaml, /^ {2}- name: "Juego"$/m);
  assert.match(yaml, /^ {6}- "A"$/m);
  const parsed = load(yaml);
  assert.equal(parsed.title, 'Título con "comillas"');
  assert.equal(parsed.products[0].price_eur, 39.95);
  assert.deepEqual(parsed.products[0].designers, ["A", "B"]);
  assert.equal(body, "\nCuerpo.\n");
});

test("replacePublishedAt solo cambia esa línea", () => {
  const source = "---\ntitle: \"X\"\npublished_at: 2026-11-05T07:40:00+01:00\nevent: release\n---\n\nCuerpo published_at: no\n";
  const next = replacePublishedAt(source, "2026-11-06T09:00:00+01:00");
  assert.equal(next, source.replace("2026-11-05T07:40:00+01:00", "2026-11-06T09:00:00+01:00"));
});

test("la versión de Telegram exige menos de 1.000 caracteres y ningún enlace", () => {
  assert.deepEqual(telegramErrors("[ANUNCIO] Juego\n\nTexto."), []);
  assert.equal(telegramErrors("x".repeat(1000)).length, 1);
  assert.match(telegramErrors("Mira www.example.com")[0], /enlace/);
  assert.match(telegramErrors("")[0], /falta/);
});

test("pieceErrors exige una sola fuente de imagen https y texto alternativo", () => {
  const base = { slug: "x", frontmatter: {}, body_markdown: "Cuerpo", telegram: "Texto" };
  assert.deepEqual(pieceErrors(base), []);
  assert.match(pieceErrors({ ...base, image: { url: "http://x.test/a.jpg", alt: "a" } }).join(), /https/);
  assert.match(pieceErrors({ ...base, image: { url: "https://x.test/a.jpg", path: "a.jpg", alt: "a" } }).join(), /exactamente una/);
  assert.match(pieceErrors({ ...base, image: { url: "https://x.test/a.jpg" } }).join(), /alternativo/);
});

test("el cuerpo del PR marca Telegram, dudas y fuentes para que el bot los extraiga", () => {
  const body = buildPullRequestBody(
    { telegram: "[ANUNCIO] Juego", dudas: ["Precio sin confirmar"], fuentes_internas: [{ url: "https://e.test", aporta: "precio" }], origen: "bot" },
    { file: "src/content/news/2026-11-05-juego.md", imageSrc: "/images/news/juego.webp", publishedAt: "2026-11-05T07:40:00+01:00" },
  );
  assert.match(body, /<!-- telegram:start -->\n\[ANUNCIO\] Juego\n<!-- telegram:end -->/);
  assert.match(body, /<!-- dudas:start -->\n- Precio sin confirmar\n<!-- dudas:end -->/);
  assert.match(body, /- https:\/\/e\.test — precio/);
});

test("materializa y publica una noticia completa contra el contrato real", async () => {
  const workdir = await mkdtemp(join(root, ".tmp-news-automation-"));
  const contentRoot = join(workdir, "content");
  const publicRoot = join(workdir, "public");
  const env = {
    ...process.env,
    ASTRO_NEWS_CONTENT_ROOT: relative(root, contentRoot),
    ASTRO_NEWS_PUBLIC_DIR: relative(root, publicRoot),
    ASTRO_CACHE_DIR: relative(root, join(workdir, "cache")),
  };
  try {
    await mkdir(join(contentRoot, "news"), { recursive: true });
    const imagePath = join(workdir, "portada.png");
    await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#2d6a4f" } }).png().toFile(imagePath);
    const piece = {
      slug: "Expedición de Prueba",
      origen: "bot",
      frontmatter: {
        title: "Expedición de prueba",
        summary: "Devir anuncia una expansión de prueba.",
        event: "announcement",
        products: [{ name: "Expedición de prueba", type: "base_game", publisher_es: "Devir", players_min: 1, players_max: 4 }],
      },
      body_markdown: "Devir anuncia **Expedición de prueba**.",
      telegram: "[ANUNCIO] Expedición de prueba\n\nDevir anuncia una expansión.",
      image: { path: imagePath, alt: "Caja de la expedición" },
    };
    const piecePath = join(workdir, "pieza.json");
    await writeFile(piecePath, JSON.stringify(piece));

    const { stdout } = await run(process.execPath, [
      "scripts/news-materialize.mjs", piecePath, "--now", "2026-11-05T21:30:00+01:00", "--pr-body", join(workdir, "pr.md"),
    ], { cwd: root, env });
    const result = JSON.parse(stdout);
    assert.equal(result.slug, "expedicion-de-prueba");
    assert.equal(result.branch, "news/expedicion-de-prueba");
    assert.deepEqual(await readdir(join(contentRoot, "news")), ["2026-11-05-expedicion-de-prueba.md"]);
    const image = await sharp(join(publicRoot, "images/news/expedicion-de-prueba.webp")).metadata();
    assert.equal(image.format, "webp");
    assert.equal(image.width, 1200);
    assert.match(await readFile(join(workdir, "pr.md"), "utf8"), /<!-- telegram:start -->/);

    // Una pieza inválida no deja ficheros.
    await writeFile(piecePath, JSON.stringify({ ...piece, slug: "rota", frontmatter: { ...piece.frontmatter, event: "rumor" } }));
    await assert.rejects(
      run(process.execPath, ["scripts/news-materialize.mjs", piecePath], { cwd: root, env }),
      (error) => /VALIDACION_FALLIDA/.test(error.stderr),
    );
    assert.deepEqual(await readdir(join(contentRoot, "news")), ["2026-11-05-expedicion-de-prueba.md"]);
    assert.deepEqual(await readdir(join(publicRoot, "images/news")), ["expedicion-de-prueba.webp"]);

    // Aprobada tras las 19:00, se publica a la mañana siguiente: cambia el prefijo, no el slug.
    const published = JSON.parse((await run(process.execPath, [
      "scripts/news-publish.mjs", "expedicion-de-prueba", "--now", "2026-11-06T09:00:00+01:00",
    ], { cwd: root, env })).stdout);
    assert.equal(published.renamed, true);
    assert.deepEqual(await readdir(join(contentRoot, "news")), ["2026-11-06-expedicion-de-prueba.md"]);
    assert.match(await readFile(join(contentRoot, "news/2026-11-06-expedicion-de-prueba.md"), "utf8"), /^published_at: 2026-11-06T09:00:00\+01:00$/m);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
});
