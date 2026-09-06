import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { unflatten } from "devalue";
import { validateCollections } from "../scripts/validate-content-relations.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("the real Astro render handles V2 mono, multi, and content_change HTML", async () => {
  const outputDirectory = await mkdtemp(join(repositoryRoot, ".tmp-news-v2-"));

  try {
    await execFileAsync(
      join(repositoryRoot, "node_modules/.bin/astro"),
      ["build", "--outDir", outputDirectory],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          ASTRO_NEWS_CONTENT_ROOT: "./tests/fixtures/content-v2",
        },
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    const [indexHtml, monoHtml, multiHtml, groupHtml, contentChangeHtml] = await Promise.all([
      readFile(join(outputDirectory, "noticias/index.html"), "utf8"),
      readFile(join(outputDirectory, "noticias/fixture-v2-uniproducto/index.html"), "utf8"),
      readFile(join(outputDirectory, "noticias/fixture-v2-multiproducto/index.html"), "utf8"),
      readFile(join(outputDirectory, "noticias/fixture-v2-precio-conjunto/index.html"), "utf8"),
      readFile(join(outputDirectory, "noticias/fixture-v2-content-change/index.html"), "utf8"),
    ]);
    const fixtureStore = unflatten(
      JSON.parse(await readFile(join(repositoryRoot, "node_modules/.astro/data-store.json"), "utf8")),
    );
    assert.deepEqual(validateCollections(fixtureStore), []);

    assert.match(monoHtml, />Producto uniproducto</);
    assert.match(monoHtml, />2 jugadores</);
    assert.match(monoHtml, />30 min</);
    assert.match(monoHtml, />8\+</);
    assert.match(monoHtml, />49,99(?:&nbsp;|\s)€</);
    assert.match(monoHtml, />Diseño</);
    assert.match(monoHtml, />Diseñadora de prueba</);
    assert.match(monoHtml, />Editorial Fixture</);

    const productAPosition = multiHtml.indexOf('data-version-id="fixture-product-a-es"');
    const productBPosition = multiHtml.indexOf('data-version-id="fixture-product-b-es"');
    assert.ok(productAPosition >= 0 && productBPosition > productAPosition);
    assert.match(multiHtml, />Sistema compartido · 2 productos</);
    assert.match(multiHtml, />2–4 jugadores</);
    assert.match(multiHtml, />45–60 min</);
    assert.match(multiHtml, />39,99(?:&nbsp;|\s)€</);
    assert.match(multiHtml, />24,99(?:&nbsp;|\s)€</);
    assert.doesNotMatch(multiHtml.slice(productBPosition), />Jugadores</);
    assert.doesNotMatch(multiHtml.slice(productBPosition), />Duración</);
    assert.doesNotMatch(multiHtml, /primary[_-]product|Producto principal/i);
    assert.match(multiHtml, /property="og:title" content="Dos productos coiguales llegan juntos \| Vis Lúdica"/);
    assert.match(multiHtml, /property="og:image" content="https:\/\/visludica\.com\/logo\.png"/);

    assert.match(contentChangeHtml, />Cambio de contenido</);
    assert.match(contentChangeHtml, />1–5 jugadores</);
    assert.match(groupHtml, /Depósito de reserva conjunto/);
    assert.match(groupHtml, /20,00(?:&nbsp;|\s)€/);
    assert.doesNotMatch(groupHtml, /class="news-detail__image"/);
    assert.equal((groupHtml.match(/20,00(?:&nbsp;|\s)€/g) ?? []).length, 1);
    assert.match(indexHtml, />Cambio de contenido</);
    assert.match(indexHtml, />Sistema compartido · 2 productos</);
    assert.doesNotMatch(indexHtml, />Producto A</);
    assert.doesNotMatch(indexHtml, />Producto B</);

    for (const html of [monoHtml, multiHtml, groupHtml, contentChangeHtml]) {
      assert.doesNotMatch(html, />Fuentes</);
      assert.doesNotMatch(html, /editorial_input|Evidence|Intake/);
      assert.doesNotMatch(html, />N\/D<|>Desconocido<|>Por determinar<|>—</);
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
