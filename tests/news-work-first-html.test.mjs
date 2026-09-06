import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
    assert.doesNotMatch(detail, /Fuentes|Evidence|Intake|N\/D|Desconocido|Por determinar/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
