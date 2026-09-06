import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("Markdown + YAML Work-first genera listado, detalle, imagen y ficha multiproducto", async () => {
  const output = await mkdtemp(join(root, ".tmp-work-first-"));
  try {
    await execFileAsync(join(root, "node_modules/.bin/astro"), ["build", "--outDir", output], {
      cwd: root,
      env: {
        ...process.env,
        ASTRO_NEWS_CONTENT_ROOT: "./tests/fixtures/work-first",
        ASTRO_NEWS_PUBLIC_DIR: "./tests/fixtures/work-first/public",
      },
      maxBuffer: 20 * 1024 * 1024,
    });
    const [index, detail] = await Promise.all([
      readFile(join(output, "noticias/index.html"), "utf8"),
      readFile(join(output, "noticias/work-first-multiproducto/index.html"), "utf8"),
    ]);
    assert.match(index, /href="\/noticias\/work-first-multiproducto"/);
    assert.match(index, /Atlas Lúdico · 2 productos/);
    assert.match(detail, /src="\/images\/news\/work-first-multiproducto.svg"/);
    assert.match(detail, /alt="Dos cajas de juego abstractas sobre una mesa"/);
    assert.match(
      await readFile(join(output, "images/news/work-first-multiproducto.svg"), "utf8"),
      /Ilustración geométrica para la fixture Work-first/,
    );
    assert.match(detail, />Expedición Boreal</);
    assert.match(detail, />Archipiélago Austral</);
    assert.match(detail, />1–4 jugadores</);
    assert.match(detail, />45–60 min</);
    assert.match(detail, />39,95(?:&nbsp;|\s)€</);
    assert.match(detail, />Diseño</);
    assert.match(detail, />Juego base</);
    assert.match(
      detail,
      /Publicado el <time datetime="2026-09-06T10:00:00\.000Z"[^>]*>6 de septiembre de 2026<\/time>/,
    );
    assert.doesNotMatch(detail, /published_at|>Lanzamiento</);
    assert.doesNotMatch(detail, /Fuentes|Evidence|Intake|N\/D|Desconocido|Por determinar/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("el archivo genera una página nueva por cada 20 noticias", async () => {
  const temporaryRoot = await mkdtemp(join(root, ".tmp-news-pagination-"));
  const contentRoot = join(temporaryRoot, "content");
  const newsRoot = join(contentRoot, "news");
  const output = join(temporaryRoot, "dist");

  try {
    await mkdir(newsRoot, { recursive: true });
    const template = await readFile(
      join(root, "tests/fixtures/work-first/news/2026-09-06-work-first-multiproducto.md"),
      "utf8",
    );

    await Promise.all(Array.from({ length: 21 }, (_, index) => {
      const position = String(index + 1).padStart(2, "0");
      const content = template.replace(
        "published_at: 2026-09-06T12:00:00+02:00",
        `published_at: 2026-09-06T12:${position}:00+02:00`,
      );
      return writeFile(
        join(newsRoot, `2026-09-06-noticia-paginada-${position}.md`),
        content,
      );
    }));

    await execFileAsync(join(root, "node_modules/.bin/astro"), ["build", "--outDir", output], {
      cwd: root,
      env: {
        ...process.env,
        ASTRO_NEWS_CONTENT_ROOT: contentRoot,
        ASTRO_NEWS_PUBLIC_DIR: "./tests/fixtures/work-first/public",
      },
      maxBuffer: 20 * 1024 * 1024,
    });

    const [firstPage, secondPage] = await Promise.all([
      readFile(join(output, "noticias/index.html"), "utf8"),
      readFile(join(output, "noticias/pagina/2/index.html"), "utf8"),
    ]);

    assert.equal((firstPage.match(/<article class="news-card/g) ?? []).length, 20);
    assert.match(firstPage, /href="\/noticias\/pagina\/2"/);
    assert.equal((secondPage.match(/<article class="news-card/g) ?? []).length, 1);
    assert.match(secondPage, /href="\/noticias"[^>]*rel="prev"/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
