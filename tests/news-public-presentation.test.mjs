import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("el listado usa el orden real y muestra las fechas de publicación", async () => {
  const index = await readFile(join(root, "dist/noticias/index.html"), "utf8");
  const quartermasterPosition = index.indexOf('href="/noticias/quartermaster-general-frente-este-castellano-draco-ideas"');
  const wilmotPosition = index.indexOf('href="/noticias/el-almacen-de-wilmot-castellano-finales-2026"');

  assert.notEqual(quartermasterPosition, -1);
  assert.notEqual(wilmotPosition, -1);
  assert.ok(quartermasterPosition < wilmotPosition, "Quartermaster debe aparecer antes que Wilmot");
  assert.match(index, /href="\/noticias\/king-of-tokyo-godzilla-disponible-devir"/);
  assert.match(index, /<time datetime="2026-09-06T21:45:46\.000Z"[^>]*>6 de septiembre de 2026<\/time>/);
  assert.match(index, /<time datetime="2026-09-06T23:39:24\.000Z"[^>]*>7 de septiembre de 2026<\/time>/);
  assert.doesNotMatch(index, /published_at/);
});

test("el detalle muestra la fecha de publicación en la cabecera", async () => {
  const [detail, datedDetail] = await Promise.all([
    readFile(join(root, "dist/noticias/king-of-tokyo-godzilla-disponible-devir/index.html"), "utf8"),
    readFile(join(root, "dist/noticias/quartermaster-general-frente-este-castellano-draco-ideas/index.html"), "utf8"),
  ]);

  assert.match(detail, /<p>Devir tiene ya disponible/);
  assert.doesNotMatch(detail, /https:\/\/devir\.es/);
  assert.doesNotMatch(detail, /Fecha editorial sin confirmar/);
  assert.doesNotMatch(detail, />Lanzamiento</);
  assert.match(detail, />Distribución<\/dt><dd[^>]*>Devir Iberia<\/dd>/);
  assert.match(detail, />2–6 jugadores<\/dd>/);
  assert.match(detail, /news-detail__image[^}]*\{[^}]*object-fit:contain/);
  assert.match(
    datedDetail,
    /Publicado el <time datetime="2026-09-06T21:45:46\.000Z"[^>]*>6 de septiembre de 2026<\/time>/,
  );
  assert.doesNotMatch(datedDetail, /published_at/);
});
